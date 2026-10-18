// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import ProfileAvatar from "../components/ProfileAvatar";
import ScoreInputHub from "../components/ScoreInputHub";
import PageHeader from "../components/PageHeader";
import tickerPtitHun from "../assets/tickers/ticker_ptit_1.png";
import ptit1Radar from "../assets/ptit1/ptit1_radar.webp";
import smallSingleZoneVisual from "../assets/rules/darts-single-zones/zone_petit_simple.webp";
import bigSingleZoneVisual from "../assets/rules/darts-single-zones/zone_gros_simple.webp";
import smallSingleZoneVisualEn from "../assets/rules/darts-single-zones/zone_petit_simple_en.webp";
import bigSingleZoneVisualEn from "../assets/rules/darts-single-zones/zone_gros_simple_en.webp";
import gros6ZonesKeypad from "../assets/gros6/gros6_zones_keypad.webp";
import zoneOuterRing from "../assets/gros6-zones/zone_outer_ring.webp";
import zoneClosed4 from "../assets/gros6-zones/zone_closed_4.webp";
import zoneClosed6 from "../assets/gros6-zones/zone_closed_6.webp";
import zoneClosed8Top from "../assets/gros6-zones/zone_closed_8_top.webp";
import zoneClosed8Bottom from "../assets/gros6-zones/zone_closed_8_bottom.webp";
import zoneClosed9 from "../assets/gros6-zones/zone_closed_9.webp";
import zoneClosed10 from "../assets/gros6-zones/zone_closed_10.webp";
import zoneClosed14 from "../assets/gros6-zones/zone_closed_14.webp";
import zoneClosed16 from "../assets/gros6-zones/zone_closed_16.webp";
import zoneClosed18Top from "../assets/gros6-zones/zone_closed_18_top.webp";
import zoneClosed18Bottom from "../assets/gros6-zones/zone_closed_18_bottom.webp";
import zoneClosed19 from "../assets/gros6-zones/zone_closed_19.webp";
import zoneClosed20 from "../assets/gros6-zones/zone_closed_20.webp";
import { useAwenaOptional } from "../awena/AwenaProvider";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import { History } from "../lib/history";
import type { Dart as UIDart } from "../lib/types";
import { cancelPtit1MatchEndSfx, playPtit1DartSequence, playPtit1HitSfx, playPtit1MatchEndSfx, playPtit1Sfx, unlockPtit1Audio } from "../lib/ptit1Sfx";
import { GROS6_SPECIAL_ZONES } from "../lib/gros6Engine";
import {
  clonePtitHunState,
  createPtitHunState,
  normalizePtitHunConfig,
  pickPtitHunBotDarts,
  playPtitHunVisit,
  ptitHunDartLabel,
  ptitHunDbullDivisor,
  rankPtitHunPlayers,
  scorePtitHunDart,
  type PtitHunState,
} from "../lib/gameEngines/ptitHunEngine";
import { isBotProfile, playerName, resolveModeProfiles, uiToGameDart } from "./newModes/newModePlayShared";
import {
  BotTurn, LogModal, PlayersModal, PremiumAwenaButton,
  PremiumEndPanel, PremiumMomentOverlay, RankingModal, StatsModal, bestBy, modePlayerColors,
} from "./newModes/PremiumPartyModeUi";
import "./newModes/PremiumPartyModeUi.css";

const ACCENT = "#f2c84b";
const ACCENT2 = "#8a5a2b";
const GREEN = "#78f3d4";
const RED = "#ff6f78";
const BLUE = "#88c8ff";
const PTIT1_ZONES_LABELS: Record<string,string> = {
  fr:"ZONES", en:"ZONES", es:"ZONAS", de:"ZONEN", it:"ZONE", nl:"ZONES", pt:"ZONAS", pl:"STREFY", ro:"ZONE", sr:"ZONE", hr:"ZONE", cs:"ZÓNY", da:"ZONER", no:"SONER", sv:"ZONER", is:"SVÆÐI", tr:"BÖLGELER", ru:"ЗОНЫ", ar:"المناطق", hi:"क्षेत्र", zh:"区域", ja:"ゾーン"
};
function ptit1CurrentLang(){
  try {
    const raw = localStorage.getItem("dc_lang_v1");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const stored = String(parsed?.lang || "").trim().toLowerCase().split("-")[0];
        if (stored) return stored;
      } catch {
        const stored = String(raw).trim().toLowerCase().split("-")[0];
        if (stored) return stored;
      }
    }
    return String(navigator.language || "en").toLowerCase().split("-")[0] || "en";
  } catch { return "en"; }
}
function ptit1ZonesLabel(){ return PTIT1_ZONES_LABELS[ptit1CurrentLang()] || PTIT1_ZONES_LABELS.en; }
function ptit1IsFrench(){ return ptit1CurrentLang() === "fr"; }
function ptit1Ui(fr: string, en: string){ return ptit1IsFrench() ? fr : en; }
function ptit1DisplaySavedLabel(label: any){
  const raw = String(label || "");
  if (ptit1IsFrench()) return raw;
  return raw
    .replace(/^PETIT\s+/i, "SMALL ")
    .replace(/^GROS\s+/i, "BIG ")
    .replace(/^HORS CIBLE\s+/i, "OFF-TARGET ")
    .replace(/HAUT/gi, "TOP")
    .replace(/BAS/gi, "BOTTOM");
}
function ptit1DisplayDartLabel(d: any){ return ptit1DisplaySavedLabel(ptitHunDartLabel(d)); }

function coachText(state: PtitHunState, activePlayer: any) {
  if (!activePlayer) return "";
  const id = String(activePlayer.id);
  const rules = state.config.rules;
  const st: any = state.statsByPlayer?.[id] || {};
  const score = Number(state.scores?.[id] || 0);
  const shield = Boolean(state.shieldActive?.[id]);
  const clean = Number(state.cleanStreak?.[id] || 0);
  const nextZero = rules.zeroAbsoluteEnabled && rules.dbullEnabled && Number(st.dbulls || 0) === rules.dbullsForZero - 1 && !state.zeroAbsoluteUsed?.[id];
  const jackpots = state.jackpotTargets?.map((t: any) => t.label).join(" / ");
  if (rules.jackpotEnabled && state.jackpotTargets?.length) return ptit1Ui(
    `Jackpot actif : ${jackpots}. Une seule touche et toute ta volée vaut 0.`,
    `Jackpot active: ${jackpots}. One hit cancels the entire visit to 0.`
  );
  if (nextZero) return ptit1Ui(
    `Encore un DBULL : le ${rules.dbullsForZero}e remet ton score à 0. Le centre peut renverser toute la partie.`,
    `One more DBULL: the ${rules.dbullsForZero}th resets your score to 0. The centre can flip the whole match.`
  );
  if (shield) return ptit1Ui(
    `Bouclier actif : tes prochaines pénalités sont divisées par ${rules.shieldDivider}. Continue de privilégier les petits simples.`,
    `Shield active: your next penalties are divided by ${rules.shieldDivider}. Keep favouring small singles.`
  );
  if (rules.shieldEnabled && clean === rules.cleanVisitsForShield - 1) return ptit1Ui(
    `Encore un TRIPLE NUL : 3 fléchettes dans le même petit simple, et le Bouclier du Hun devient permanent.`,
    `One more TRIPLE ZERO: 3 darts in the same small single and the Hun Shield becomes permanent.`
  );
  if (score >= 120 && rules.dbullEnabled) {
    const nextDbull = Number(st.dbulls || 0) + 1;
    const div = Math.pow(Number(rules.dbullDivider || 2), Math.max(1,nextDbull));
    const zeroTail = rules.zeroAbsoluteEnabled && nextDbull >= rules.dbullsForZero
      ? ptit1Ui(" et déclenchera ZÉRO ABSOLU", " and will trigger ABSOLUTE ZERO")
      : "";
    return ptit1Ui(
      `Ton score monte : le prochain DBULL divisera le total par ${div}${zeroTail}. Le Bull25 juste autour reste dangereux : ×${rules.bull25Factor}.`,
      `Your score is climbing: the next DBULL divides the total by ${div}${zeroTail}. Bull25 around it is still dangerous: ×${rules.bull25Factor}.`
    );
  }
  return ptit1Ui(
    `Le petit simple du 1 reste la zone reine : +1 seulement. ${rules.tripleNulEnabled ? "Trois petits 1 = TRIPLE NUL, donc volée à 0." : "Reste au plus près du centre des secteurs."}`,
    `Small single 1 is still the safest zone: only +1. ${rules.tripleNulEnabled ? "Three small 1s = TRIPLE ZERO, so the visit returns to 0." : "Stay close to the inner single area."}`
  );
}

// Integration markers retained after the compact UI refactor: JACKPOT · ZONE SPÉCIALE · Cible tactique P’TIT 1 · P’TIT 1 · CARTE DES RISQUES
const PTIT1_BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
function ptit1Polar(cx: number, cy: number, r: number, deg: number) { const rad = ((deg - 90) * Math.PI) / 180; return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }; }
function ptit1RingPath(cx: number, cy: number, ro: number, ri: number, start: number, end: number) { const a = ptit1Polar(cx, cy, ro, start), b = ptit1Polar(cx, cy, ro, end), c = ptit1Polar(cx, cy, ri, end), d = ptit1Polar(cx, cy, ri, start); return `M ${a.x} ${a.y} A ${ro} ${ro} 0 0 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${ri} ${ri} 0 0 0 ${d.x} ${d.y} Z`; }
function JackpotMiniTarget({ targets }: any) {
  const rows = Array.isArray(targets) ? targets : [];
  const oneIndex = PTIT1_BOARD_ORDER.indexOf(1);
  const oneStart = oneIndex * 18 - 9;
  const oneEnd = oneStart + 18;
  return <div aria-label={`Cible tactique P’TIT 1${rows.length ? ` · Jackpot ${rows.map((t: any) => t.label).join(" ")}` : ""}`} style={{ width: "clamp(76px,22vw,96px)", aspectRatio: "1 / 1", flex: "0 0 auto", borderRadius: 999, padding: 3, background: "radial-gradient(circle,rgba(120,243,212,.10),rgba(255,221,80,.08) 48%,rgba(0,0,0,.52))", border: "1px solid rgba(255,216,77,.28)", boxShadow: "0 0 22px rgba(255,203,50,.10)" }}>
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: "block" }}>
      <circle cx="50" cy="50" r="47" fill="#10141b" stroke="rgba(255,255,255,.20)" strokeWidth="1" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,111,120,.28)" strokeWidth="7" />
      <circle cx="50" cy="50" r="36.5" fill="none" stroke="rgba(255,184,107,.16)" strokeWidth="6" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,111,120,.28)" strokeWidth="6" />
      <circle cx="50" cy="50" r="17.5" fill="none" stroke="rgba(120,243,212,.12)" strokeWidth="18" />
      <path d={ptit1RingPath(50,50,27,8,oneStart,oneEnd)} fill="rgba(120,243,212,.78)" stroke="#fff0a0" strokeWidth="1.05" style={{ filter: "drop-shadow(0 0 4px rgba(120,243,212,.9))" }} />
      {PTIT1_BOARD_ORDER.map((n, idx) => { const a = idx * 18 - 9; const pt = ptit1Polar(50,50,45,a+9); return <g key={n}><line x1="50" y1="50" x2={ptit1Polar(50,50,47,a).x} y2={ptit1Polar(50,50,47,a).y} stroke="rgba(255,255,255,.065)" strokeWidth=".7" /><text x={pt.x} y={pt.y+1.6} textAnchor="middle" fontSize={n === 1 ? "5.8" : "4.4"} fill={n === 1 ? "#fff3a7" : "rgba(255,255,255,.72)"} fontWeight="900">{n}</text></g>; })}
      {rows.map((t: any, i: number) => { const idx = Math.max(0, PTIT1_BOARD_ORDER.indexOf(Number(t.number))); const start = idx * 18 - 9, end = start + 18; const d = t.bed === "D" ? ptit1RingPath(50,50,48,40,start,end) : ptit1RingPath(50,50,33,27,start,end); return <path key={`${t.label}-${i}`} d={d} fill={i ? "rgba(76,180,255,.88)" : "rgba(255,216,77,.94)"} stroke="#fff" strokeWidth="1.15" style={{ filter: "drop-shadow(0 0 5px rgba(255,216,77,.85))" }} />; })}
      <circle cx="50" cy="50" r="7" fill="#f36a59" stroke="#ffd84d" strokeWidth="1.4" />
      <circle cx="50" cy="50" r="3.2" fill="#78f3d4" stroke="#fff" strokeWidth="1" />
      <text x="50" y="62" textAnchor="middle" fontSize="4.2" fill="#78f3d4" fontWeight="1000">P’TIT 1</text>
    </svg>
  </div>;
}

const PTIT1_SPECIAL_ZONE_META: Record<string, any> = {
  outer_numbers_ring: { fr: "Contour extérieur", en: "Outer ring", asset: zoneOuterRing },
  closed_4: { fr: "HORS CIBLE 4", en: "OFF-TARGET 4", asset: zoneClosed4 },
  closed_6: { fr: "HORS CIBLE 6", en: "OFF-TARGET 6", asset: zoneClosed6 },
  closed_8_top: { fr: "HORS CIBLE 8 HAUT", en: "OFF-TARGET 8 TOP", asset: zoneClosed8Top },
  closed_8_bottom: { fr: "HORS CIBLE 8 BAS", en: "OFF-TARGET 8 BOTTOM", asset: zoneClosed8Bottom },
  closed_9: { fr: "HORS CIBLE 9", en: "OFF-TARGET 9", asset: zoneClosed9 },
  closed_10: { fr: "HORS CIBLE 10", en: "OFF-TARGET 10", asset: zoneClosed10 },
  closed_14: { fr: "HORS CIBLE 14", en: "OFF-TARGET 14", asset: zoneClosed14 },
  closed_16: { fr: "HORS CIBLE 16", en: "OFF-TARGET 16", asset: zoneClosed16 },
  closed_18_top: { fr: "HORS CIBLE 18 HAUT", en: "OFF-TARGET 18 TOP", asset: zoneClosed18Top },
  closed_18_bottom: { fr: "HORS CIBLE 18 BAS", en: "OFF-TARGET 18 BOTTOM", asset: zoneClosed18Bottom },
  closed_19: { fr: "HORS CIBLE 19", en: "OFF-TARGET 19", asset: zoneClosed19 },
  closed_20: { fr: "HORS CIBLE 20", en: "OFF-TARGET 20", asset: zoneClosed20 },
};
function ptit1SpecialLabel(code: string) { const meta=PTIT1_SPECIAL_ZONE_META[String(code||"")]; const lang=ptit1CurrentLang(); return meta ? (lang === "fr" ? meta.fr : meta.en) : String(code||"ZONE"); }
function Ptit1SpecialZoneIcon({ code, accent=ACCENT, size=72 }: any){ const asset=PTIT1_SPECIAL_ZONE_META[String(code||"")]?.asset; if(!asset)return null; return <img src={asset} alt="" draggable={false} style={{width:size,height:size,objectFit:"contain",display:"block",filter:`drop-shadow(0 0 8px ${accent}22)`}}/>; }
function Ptit1SpecialZonesModal({ onClose, onPick, accent=ACCENT }: any){
  const awena = useAwenaOptional();
  const askAwena = React.useCallback(async()=>{ if(!awena) return; try { const fr=ptit1IsFrench(); awena.setRuntime?.({mode:"ptit_hun",sport:"darts",phase:"special_zones",screenLabel:ptit1Ui("P’TIT 1 · Zones spéciales","P’TIT 1 · Special zones")}); awena.openPanel?.(); await awena.ask?.(fr ? "Explique-moi uniquement les zones spéciales de P’TIT 1 : elles reprennent les zones hors cible du Gros 6, comment les reconnaître, comment les sélectionner dans le keypad et quelle pénalité MISS elles déclenchent dans P’TIT 1." : "Explain only P’TIT 1 special zones: they reuse the off-target zones from GROS 6, how to recognize them, how to select them on the keypad, and which MISS penalty they trigger in P’TIT 1.", { canonicalFrench:fr }); } catch {} },[awena]);
  return <FloatingPanel title={ptit1Ui("ZONES SPÉCIALES","SPECIAL ZONES")} subtitle={ptit1Ui("Sélectionne exactement la zone touchée","Select the exact zone that was hit")} onClose={onClose} accent={accent}><div style={{display:"flex",justifyContent:"center",marginBottom:10}}><button type="button" onClick={askAwena} title={ptit1Ui("Awena explique les zones spéciales","Awena explains special zones")} aria-label={ptit1Ui("Awena explique les zones spéciales","Awena explains special zones")} style={{width:58,height:58,padding:0,borderRadius:999,border:`2px solid ${accent}`,background:"rgba(0,0,0,.38)",overflow:"hidden",cursor:"pointer",boxShadow:`0 0 20px ${accent}55`}}><img src="/awena/awena-avatar.webp" alt="Awena" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/></button></div><div style={{height:"100%",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(88px,1fr))",gap:8,alignContent:"start",padding:4}}>{GROS6_SPECIAL_ZONES.map((zone:any)=><button key={zone.code} type="button" onClick={()=>onPick({code:zone.code,label:ptit1SpecialLabel(zone.code)})} title={ptit1SpecialLabel(zone.code)} aria-label={ptit1SpecialLabel(zone.code)} style={{minHeight:96,borderRadius:14,border:0,background:"transparent",display:"grid",placeItems:"center",padding:6,cursor:"pointer"}}><Ptit1SpecialZoneIcon code={zone.code} accent={accent}/></button>)}</div></FloatingPanel>;
}

function ptit1TokenMeta(raw: any, accent = ACCENT) {
  if (!raw) return { label: "—", color: "#7a8496", border: "rgba(255,255,255,.08)", bg: "rgba(255,255,255,.03)", badge: "" };
  const g:any = raw?.bed ? raw : uiToGameDart(raw);
  const txt = String(ptit1DisplayDartLabel(g) || "").toUpperCase();
  if (txt === "BULL25" || txt === "BULL") return { label: "BULL", color: "#ffdde2", border: "rgba(255,111,120,.48)", bg: "linear-gradient(180deg,rgba(114,25,38,.92),rgba(31,10,14,.97))", badge: "×" };
  if (txt === "DBULL") return { label: "DBULL", color: "#dcfff0", border: "rgba(120,243,212,.55)", bg: "linear-gradient(180deg,rgba(14,92,70,.92),rgba(5,28,22,.97))", badge: "÷" };
  if (txt === "MISS" || txt.includes("HORS") || txt.includes("OFF-TARGET")) return { label: txt === "MISS" ? "MISS" : "ZONE", color: "#ffe3e7", border: "rgba(255,97,122,.46)", bg: "linear-gradient(180deg,rgba(101,22,34,.94),rgba(35,8,12,.97))", badge: "!" };
  if (txt.startsWith("GROS")) return { label: txt.replace("GROS ", "G"), color: "#fff1d7", border: "rgba(255,176,72,.5)", bg: "linear-gradient(180deg,rgba(180,93,19,.92),rgba(54,24,8,.97))", badge: "×10" };
  if (txt.startsWith("PETIT")) return { label: txt.replace("PETIT ", "P"), color: "#5b3610", border: "rgba(255,232,150,.56)", bg: "linear-gradient(180deg,rgba(255,239,156,.96),rgba(214,188,101,.96))", badge: "+" };
  if (txt.startsWith("D")) return { label: txt, color: "#edfaff", border: "rgba(125,224,255,.5)", bg: "linear-gradient(180deg,rgba(61,113,139,.94),rgba(15,28,35,.97))", badge: "×2" };
  if (txt.startsWith("T")) return { label: txt, color: "#ffe8ff", border: "rgba(229,144,255,.48)", bg: "linear-gradient(180deg,rgba(111,64,126,.94),rgba(29,15,34,.97))", badge: "×3" };
  return { label: txt || String(raw), color: "#fff", border: `${accent}66`, bg: `${accent}12`, badge: "" };
}

function Ptit1LiveTargetBoard({ rules, targets = [], score, currentThrow = [] }: any) {
  const oneIndex = PTIT1_BOARD_ORDER.indexOf(1);
  const oneStart = oneIndex * 18 - 9;
  const oneEnd = oneStart + 18;
  const tokenCells = [
    { label: ptit1Ui("PETIT 1","SMALL 1"), hint: ptit1Ui("objectif principal","main target"), color: "#78f3d4" },
    { label: ptit1Ui("GROS 1","BIG 1"), hint: `+${rules.outerSingleFactor}`, color: "#ffad55" },
    { label: "BULL25", hint: `×${rules.bull25Factor}`, color: "#ff6f78" },
    { label: "DBULL", hint: rules.dbullEnabled ? `÷${rules.dbullDivider}` : "+50", color: "#78f3d4" },
  ];
  const hitTokens = (currentThrow || []).slice(0,3).map((d:any, i:number) => ({ ...ptit1TokenMeta(d), key: i }));
  return <div style={{ minHeight: 0, display: "grid", gap: 8 }}>
    <div style={{ borderRadius: 18, border: `1px solid ${ACCENT}44`, background: "radial-gradient(circle at 50% 12%,rgba(255,216,77,.16),transparent 30%), radial-gradient(circle at 50% 68%,rgba(120,243,212,.08),transparent 44%), linear-gradient(180deg,rgba(14,17,24,.98),rgba(5,7,11,.99))", padding: 10 }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: "block", maxHeight: 420, margin: "0 auto", filter: "drop-shadow(0 16px 28px rgba(0,0,0,.50))" }}>
        <circle cx="50" cy="50" r="49" fill="#0d1118" stroke="rgba(255,216,77,.18)" strokeWidth="1" />
        {PTIT1_BOARD_ORDER.map((n, idx) => {
          const start = idx * 18 - 9;
          const end = start + 18;
          const isOne = n === 1;
          const baseDark = idx % 2 === 0 ? "#14181f" : "#efe0c9";
          const baseLight = idx % 2 === 0 ? "#efe0c9" : "#14181f";
          return <g key={n}>
            <path d={ptit1RingPath(50,50,45,38,start,end)} fill={isOne ? "rgba(255,173,85,.95)" : (idx % 2 === 0 ? "#d63c39" : "#1a9157")} opacity={isOne ? 1 : .92} />
            <path d={ptit1RingPath(50,50,37.5,28.8,start,end)} fill={isOne ? "rgba(255,232,150,.95)" : baseDark} />
            <path d={ptit1RingPath(50,50,28.4,21,start,end)} fill={isOne ? "rgba(194,33,40,.98)" : (idx % 2 === 0 ? "#d63c39" : "#1a9157")} opacity={isOne ? 1 : .92} />
            <path d={ptit1RingPath(50,50,20.4,8.6,start,end)} fill={isOne ? "rgba(120,243,212,.96)" : baseLight} stroke={isOne ? "#f7ffbe" : "rgba(255,255,255,.05)"} strokeWidth={isOne ? 1.1 : .35} />
          </g>;
        })}
        {PTIT1_BOARD_ORDER.map((n, idx) => {
          const a = idx * 18 - 9;
          const line = ptit1Polar(50,50,45,a);
          const pt = ptit1Polar(50,50,41.6,a+9);
          const isOne = n === 1;
          return <g key={`mark-${n}`}>
            <line x1="50" y1="50" x2={line.x} y2={line.y} stroke="rgba(255,255,255,.11)" strokeWidth=".6" />
            <text x={pt.x} y={pt.y+1.5} textAnchor="middle" fontSize={isOne ? "6.2" : "4.6"} fill={isOne ? "#fff5b6" : "rgba(255,255,255,.85)"} fontWeight="1000">{n}</text>
          </g>;
        })}
        <path d={ptit1RingPath(50,50,20.4,8.6,oneStart,oneEnd)} fill="rgba(120,243,212,.95)" stroke="#f7ffbe" strokeWidth="1.2" style={{ filter: "drop-shadow(0 0 8px rgba(120,243,212,.66))" }} />
        <path d={ptit1RingPath(50,50,37.5,28.8,oneStart,oneEnd)} fill="rgba(255,173,85,.98)" stroke="#ffe0a9" strokeWidth="1.1" style={{ filter: "drop-shadow(0 0 6px rgba(255,173,85,.45))" }} />
        {(targets || []).map((t:any, i:number) => {
          const idx = PTIT1_BOARD_ORDER.indexOf(Number(t.number));
          if (idx < 0) return null;
          const start = idx * 18 - 9;
          const end = start + 18;
          const d = t.bed === "D" ? ptit1RingPath(50,50,45,38,start,end) : ptit1RingPath(50,50,28.4,21,start,end);
          return <path key={`${t.label}-${i}`} d={d} fill={i % 2 === 0 ? "rgba(255,62,74,.95)" : "rgba(255,216,77,.95)"} stroke="#fff6c4" strokeWidth="1.2" style={{ filter: "drop-shadow(0 0 10px rgba(255,87,87,.66))" }} />;
        })}
        <circle cx="50" cy="50" r="6.4" fill="rgba(255,111,120,.98)" stroke="#ffe8b6" strokeWidth="1.2" style={{ filter: "drop-shadow(0 0 10px rgba(255,111,120,.45))" }} />
        <circle cx="50" cy="50" r="3.1" fill="rgba(120,243,212,.98)" stroke="#fff" strokeWidth="1" style={{ filter: "drop-shadow(0 0 10px rgba(120,243,212,.62))" }} />
        <text x="50" y="95" textAnchor="middle" fontSize="5" fill="#d6deea" fontWeight="900">{ptit1Ui("Cible vivante · zones colorées = impacts clés","Live board · coloured zones = key impacts")}</text>
      </svg>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
      {tokenCells.map((item) => <div key={item.label} style={{ minWidth: 0, borderRadius: 12, padding: "7px 6px", border: `1px solid ${item.color}44`, background: `${item.color}10`, textAlign: "center" }}><div style={{ color: item.color, fontSize: 7.2, fontWeight: 1100, letterSpacing: .4 }}>{item.label}</div><div style={{ color: "#fff", marginTop: 2, fontSize: 7.6, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.hint}</div></div>)}
    </div>
    {hitTokens.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
      {Array.from({ length: 3 }).map((_, i) => {
        const token:any = hitTokens[i];
        return <div key={i} style={{ minHeight: 48, borderRadius: 12, border: `1px solid ${token?.border || "rgba(255,255,255,.08)"}`, background: token?.bg || "rgba(255,255,255,.03)", display: "grid", placeItems: "center", color: token?.color || "#7a8496", fontWeight: 1100, position: "relative" }}>
          {token ? <><span style={{ position: "absolute", top: 6, right: 8, fontSize: 7, opacity: .88 }}>{token.badge}</span><span style={{ fontSize: 12 }}>{token.label}</span></> : <span style={{ fontSize: 8.6 }}>{`${ptit1Ui("FLÉCHETTE","DART")} ${i+1}`}</span>}
        </div>;
      })}
    </div> : null}
  </div>;
}

function PtitHunRiskBoard({ state, playerId, currentThrow, preview }: any) {
  const rules = state.config.rules;
  const st = state.statsByPlayer?.[playerId] || {};
  const score = Number(state.scores?.[playerId] || 0);
  const shield = Boolean(state.shieldActive?.[playerId]);
  const clean = Number(state.cleanStreak?.[playerId] || 0);
  const jackpotText = rules.jackpotEnabled && state.jackpotTargets?.length ? state.jackpotTargets.map((t: any) => t.label).join(" / ") : "OFF";
  const missLabel = rules.missMode === "add" ? `+${rules.missValue}` : `TOTAL ×${rules.missValue}`;
  const stack = typeof window !== "undefined" ? window.innerWidth < 760 : false;
  const objectiveRows = [
    { label: ptit1Ui("OBJECTIF #1","GOAL #1"), title: ptit1Ui("PETIT 1","SMALL 1"), detail: ptit1Ui("C’est la meilleure case du mode : +1 seulement.","This is the best square in the mode: only +1."), color: GREEN },
    { label: ptit1Ui("OBJECTIF #2","GOAL #2"), title: "DBULL", detail: rules.dbullEnabled ? ptit1Ui(`Le ${rules.dbullsForZero}e DBULL cumulé remet le score à 0.`,`Cumulative DBULL #${rules.dbullsForZero} resets the score to 0.`) : ptit1Ui("DBULL simple : +50.","Plain DBULL: +50."), color: BLUE },
    { label: ptit1Ui("JACKPOT ACTIF","LIVE JACKPOT"), title: jackpotText, detail: rules.jackpotEnabled ? ptit1Ui("Évite cette Double/Triple : une seule touche annule la volée.","Avoid this Double/Triple: one hit cancels the visit.") : ptit1Ui("Jackpot désactivé pour cette partie.","Jackpot is disabled for this match."), color: "#ffd84d" },
  ];
  const dangerRows = [
    { label: "GROS", detail: `+ ${ptit1Ui("valeur","value")} ×${rules.outerSingleFactor}`, color: "#ffad55" },
    { label: "DOUBLE", detail: `HIT ×${rules.doubleFactor}`, color: "#7ddfff" },
    { label: "TRIPLE", detail: `HIT ×${rules.tripleFactor}`, color: "#e490ff" },
    { label: "BULL25", detail: `25 ×${rules.bull25Factor}`, color: "#ff6f78" },
    { label: "MISS", detail: missLabel, color: RED },
  ];
  const liveRows = [
    { label: ptit1Ui("SCORE ACTUEL","CURRENT SCORE"), value: score, color: ACCENT },
    { label: "JACKPOT", value: jackpotText, color: "#ffd84d" },
    { label: ptit1Ui("ZÉRO ABSOLU","ABSOLUTE ZERO"), value: `${st.dbulls || 0}/${rules.dbullsForZero}`, color: BLUE },
    { label: ptit1Ui("BOUCLIER DU HUN","HUN SHIELD"), value: shield ? ptit1Ui("ACTIF","ACTIVE") : `${clean}/${rules.cleanVisitsForShield}`, color: GREEN },
  ];
  const previewTag = preview?.jackpotHit ? ptit1Ui("JACKPOT : volée annulée","JACKPOT: visit cancelled") : preview?.zeroAbsoluteNow ? ptit1Ui("ZÉRO ABSOLU prêt","ABSOLUTE ZERO ready") : preview?.shieldUnlockedNow ? ptit1Ui("BOUCLIER DÉBLOQUÉ","SHIELD UNLOCKED") : preview?.tripleNul ? ptit1Ui("TRIPLE NUL","TRIPLE ZERO") : preview?.petitOnePerfect ? ptit1Ui("P’TIT 1 PARFAIT","PERFECT P’TIT 1") : "";
  return <div style={{ height: "100%", minHeight: 0, display: "grid", gap: 10, gridTemplateRows: "auto minmax(0,1fr) auto" }}>
    <section style={{ display: "grid", gridTemplateColumns: stack ? "1fr" : "repeat(4,minmax(0,1fr))", gap: 7 }}>
      {liveRows.map((item) => <div key={item.label} style={{ minWidth: 0, borderRadius: 14, padding: 10, border: `1px solid ${item.color}55`, background: `${item.color}0f` }}><div style={{ color: item.color, fontSize: 7.8, fontWeight: 1100, letterSpacing: .7 }}>{item.label}</div><div style={{ color: "#fff", fontSize: item.label === "JACKPOT" ? 20 : 24, lineHeight: 1.05, fontWeight: 1100, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.value}</div><div style={{ color: "#929bad", fontSize: 7.6, marginTop: 4 }}>{item.label === ptit1Ui("SCORE ACTUEL","CURRENT SCORE") ? ptit1Ui("Le plus petit score gagne.","Lowest score wins.") : item.label === "JACKPOT" ? ptit1Ui("Double/Triple rouge à éviter immédiatement.","Red Double/Triple to avoid right now.") : item.label === ptit1Ui("ZÉRO ABSOLU","ABSOLUTE ZERO") ? ptit1Ui("Progression centre cumulée.","Cumulative centre progress.") : ptit1Ui("Bonus défensif longue durée.","Long-term defensive bonus.")}</div></div>)}
    </section>

    <section style={{ minHeight: 0, display: "grid", gridTemplateColumns: stack ? "1fr" : "minmax(0,1.05fr) minmax(240px,.95fr)", gap: 10 }}>
      <Ptit1LiveTargetBoard rules={rules} targets={state.jackpotTargets || []} score={score} currentThrow={currentThrow} />
      <div style={{ minHeight: 0, display: "grid", gap: 10, alignContent: "start" }}>
        <div style={{ borderRadius: 16, padding: 10, border: `1px solid ${ACCENT}44`, background: "linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02))" }}>
          <div style={{ color: ACCENT, fontSize: 8.5, fontWeight: 1100, letterSpacing: .8, marginBottom: 7 }}>{ptit1Ui("OBJECTIFS & BONUS","GOALS & BONUSES")}</div>
          <div style={{ display: "grid", gap: 7 }}>{objectiveRows.map((item) => <div key={item.label} style={{ borderRadius: 12, border: `1px solid ${item.color}44`, background: `${item.color}0d`, padding: 8 }}><div style={{ color: item.color, fontSize: 7.2, fontWeight: 1100, letterSpacing: .5 }}>{item.label}</div><div style={{ color: "#fff", marginTop: 3, fontSize: 11.5, fontWeight: 1050 }}>{item.title}</div><div style={{ color: "#b8c0ce", marginTop: 3, fontSize: 8, lineHeight: 1.45 }}>{item.detail}</div></div>)}</div>
        </div>
        <div style={{ borderRadius: 16, padding: 10, border: `1px solid ${RED}44`, background: "linear-gradient(180deg,rgba(255,100,120,.08),rgba(255,255,255,.02))" }}>
          <div style={{ color: RED, fontSize: 8.5, fontWeight: 1100, letterSpacing: .8, marginBottom: 7 }}>{ptit1Ui("RISQUES IMMÉDIATS","IMMEDIATE RISKS")}</div>
          <div style={{ display: "grid", gap: 6 }}>{dangerRows.map((item) => <div key={item.label} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 7, alignItems: "start", borderRadius: 11, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", padding: "7px 8px" }}><span style={{ color: item.color, fontSize: 8.2, fontWeight: 1100, minWidth: 56 }}>{item.label}</span><span style={{ color: "#dfe6f2", fontSize: 8.1, lineHeight: 1.45 }}>{item.detail}</span></div>)}</div>
        </div>
      </div>
    </section>

    <section style={{ display: "grid", gap: 8 }}>
      {previewTag ? <div style={{ borderRadius: 12, padding: "8px 10px", border: `1px solid ${ACCENT}44`, background: `${ACCENT}12`, color: "#fff", fontSize: 8.2, fontWeight: 1000 }}>{previewTag}</div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
        {[0,1,2].map((i) => { const d:any = currentThrow?.[i]; const token = d ? ptit1TokenMeta(d) : null; return <div key={i} style={{ borderRadius: 12, padding: 8, minHeight: 42, border: `1px solid ${token?.border || "rgba(255,255,255,.08)"}`, background: token?.bg || "rgba(255,255,255,.025)", textAlign: "center", color: token?.color || "#6d7485", display: "grid", placeItems: "center", fontSize: token ? 11 : 8.5, fontWeight: 1050 }}>{token ? token.label : `${ptit1Ui("FLÉCHETTE","DART")} ${i+1}`}</div>; })}
      </div>
    </section>
  </div>;
}

function FloatingPanel({ title, subtitle, onClose, children, accent = ACCENT }: any) {
  return <div className="party-mode__modal" role="dialog" aria-modal="true" aria-label={title} onClick={onClose} style={{ padding: 8, background: "rgba(0,0,0,.82)", backdropFilter: "blur(9px)" }}>
    <div className="party-mode__modal-card" onClick={(e) => e.stopPropagation()} style={{ width: "min(920px,98vw)", height: "min(92dvh,760px)", maxHeight: "92dvh", borderRadius: 20, border: `1px solid ${accent}44`, background: "linear-gradient(180deg,rgba(15,17,23,.995),rgba(4,6,10,.995))", boxShadow: "0 28px 90px rgba(0,0,0,.78)", display: "grid", gridTemplateRows: "auto minmax(0,1fr)" }}>
      <header style={{ minHeight: 50, padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        <div><b style={{ color: accent, fontSize: 12 }}>{title}</b>{subtitle ? <span>{subtitle}</span> : null}</div>
        <button type="button" onClick={onClose} aria-label={ptit1Ui("Fermer","Close")}>×</button>
      </header>
      <div style={{ minHeight: 0, padding: 8, overflow: "auto" }}>{children}</div>
    </div>
  </div>;
}

function Ptit1BonusModal({ kind, state, playerId, onClose }: any) {
  const rules = state.config.rules;
  const st:any = state.statsByPlayer?.[playerId] || {};
  const isZero = kind === "zero";
  const title = isZero ? ptit1Ui("ZÉRO ABSOLU","ABSOLUTE ZERO") : ptit1Ui("BOUCLIER DU HUN","HUN SHIELD");
  const color = isZero ? BLUE : GREEN;
  const current = isZero ? Number(st.dbulls || 0) : Number(state.cleanStreak?.[playerId] || 0);
  const target = isZero ? Number(rules.dbullsForZero || 3) : Number(rules.cleanVisitsForShield || 3);
  const active = isZero ? Boolean(state.zeroAbsoluteUsed?.[playerId]) : Boolean(state.shieldActive?.[playerId]);
  return <FloatingPanel title={title} subtitle={isZero ? ptit1Ui("Bonus centre · DBULL cumulés","Centre bonus · cumulative DBULLs") : ptit1Ui("Bonus précision · TRIPLE NUL consécutifs","Precision bonus · consecutive TRIPLE ZERO visits")} onClose={onClose} accent={color}>
    <div style={{ height:"100%", display:"grid", alignContent:"center", gap:10, maxWidth:680, margin:"0 auto" }}>
      <div style={{ borderRadius:18, padding:16, border:`1px solid ${color}55`, background:`radial-gradient(circle at 50% 0%,${color}20,transparent 45%),rgba(255,255,255,.025)`, textAlign:"center" }}>
        <div style={{ color, fontSize:11, fontWeight:1100, letterSpacing:1 }}>{title}</div>
        <div style={{ marginTop:8, color:"#fff", fontSize:38, fontWeight:1100 }}>{active ? ptit1Ui("ACTIF","ACTIVE") : `${Math.min(current,target)}/${target}`}</div>
        <div style={{ margin:"10px auto 0", width:"min(360px,86%)", height:10, borderRadius:999, background:"rgba(255,255,255,.08)", overflow:"hidden" }}><i style={{ display:"block", height:"100%", width:`${active ? 100 : Math.min(100,(current/Math.max(1,target))*100)}%`, borderRadius:999, background:`linear-gradient(90deg,${color},#fff)` }} /></div>
      </div>
      <div style={{ borderRadius:16, padding:14, border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.025)", color:"#dfe6f2", fontSize:12, lineHeight:1.55 }}>
        {isZero ? (ptit1IsFrench()
          ? <><b style={{ color }}>Principe.</b> Le DBULL agit <b>au moment exact du hit</b>. Avec une base ÷{rules.dbullDivider}, le 1er DBULL divise par <b>{rules.dbullDivider}</b>, le 2e par <b>{Math.pow(Number(rules.dbullDivider || 2),2)}</b>. Au <b>{target}e DBULL cumulé</b>, ZÉRO ABSOLU remet immédiatement le score à <b>0</b>, puis les fléchettes restantes de la volée continuent normalement.</>
          : <><b style={{ color }}>How it works.</b> DBULL acts <b>at the exact hit</b>. With base ÷{rules.dbullDivider}, the 1st DBULL divides by <b>{rules.dbullDivider}</b>, the 2nd by <b>{Math.pow(Number(rules.dbullDivider || 2),2)}</b>. On cumulative DBULL <b>#{target}</b>, ABSOLUTE ZERO immediately resets the score to <b>0</b>, then any remaining darts in the visit continue normally.</>)
        : (ptit1IsFrench()
          ? <><b style={{ color }}>Principe.</b> Enchaîne <b>{target} TRIPLE NUL consécutifs</b> : à chaque volée, les 3 fléchettes doivent toucher <b>le même petit simple</b>. Le chiffre peut changer à la volée suivante. Une fois débloqué, le Bouclier reste actif jusqu’à la fin et réduit chaque pénalité dangereuse par <b>{rules.shieldDivider}</b>.</>
          : <><b style={{ color }}>How it works.</b> Chain <b>{target} consecutive TRIPLE ZERO visits</b>: in each visit, all 3 darts must hit <b>the same small single</b>. The number may change on the next visit. Once unlocked, the Shield stays active until the end and divides each dangerous penalty by <b>{rules.shieldDivider}</b>.</>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:8 }}>
        <div style={{ borderRadius:14, padding:10, border:`1px solid ${color}33`, background:`${color}0b` }}><small style={{ color, fontWeight:1000 }}>{ptit1Ui("ÉTAT ACTUEL","CURRENT STATUS")}</small><b style={{ display:"block", marginTop:4, color:"#fff", fontSize:17 }}>{active ? ptit1Ui("DÉBLOQUÉ","UNLOCKED") : `${current}/${target}`}</b></div>
        <div style={{ borderRadius:14, padding:10, border:"1px solid rgba(255,255,255,.08)", background:"rgba(255,255,255,.025)" }}><small style={{ color:"#8f98aa", fontWeight:1000 }}>{isZero ? ptit1Ui("EFFET","EFFECT") : ptit1Ui("PROTECTION","PROTECTION")}</small><b style={{ display:"block", marginTop:4, color:"#fff", fontSize:17 }}>{isZero ? "SCORE = 0" : `${ptit1Ui("PÉNALITÉS","PENALTIES")} ÷${rules.shieldDivider}`}</b></div>
      </div>
    </div>
  </FloatingPanel>;
}


function Ptit1MiniKpi({ label, value, color = ACCENT, onClick }: any) {
  const Tag: any = onClick ? "button" : "div";
  return <Tag type={onClick ? "button" : undefined} onClick={onClick} style={{ minWidth: 0, height: "100%", border: 0, borderRadius: 10, background: "rgba(0,0,0,.28)", color: "#fff", padding: "4px 3px", textAlign: "center", cursor: onClick ? "pointer" : "default" }}>
    <small style={{ display: "block", color: "#8791a4", fontSize: 6.2, fontWeight: 1000, letterSpacing: .45 }}>{label}</small>
    <b style={{ display: "block", marginTop: 2, color, fontSize: 13.5, lineHeight: 1, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</b>
  </Tag>;
}

function Ptit1DartsRow({ currentThrow, accent, liveScore, liveDelta = 0, liveSteps = [] }: any) {
  return <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}>
    {[0,1,2].map((i) => {
      const token = currentThrow?.[i] ? ptit1TokenMeta(currentThrow[i], accent) : null;
      const step:any = liveSteps?.[i];
      const deltaColor = step?.delta === 0 ? "#b8c0cc" : step?.delta < 0 ? GREEN : step?.kind === "miss" ? RED : token?.color;
      return <div key={i} style={{ height: 32, minWidth: 0, borderRadius: 10, border: `1px solid ${token?.border || "rgba(255,255,255,.08)"}`, background: token?.bg || "rgba(0,0,0,.22)", display: "grid", placeItems: "center", color: token?.color || "#7f8798", fontWeight: 1100, lineHeight: 1, position: "relative", overflow: "hidden" }}>
        {token ? <><span style={{ fontSize: 9.1 }}>{token.label}</span>{step ? <small style={{ position: "absolute", right: 5, top: 4, fontSize: 5.7, color: deltaColor, fontWeight: 1000 }}>{`${step.delta > 0 ? "+" : ""}${step.delta}`}</small> : null}</> : <span style={{ fontSize: 9.5 }}>{`D${i+1}`}</span>}
      </div>;
    })}
    <div style={{ height: 32, minWidth: 0, borderRadius: 10, border: `1px solid ${accent}55`, background: `linear-gradient(180deg,${accent}18,rgba(0,0,0,.30))`, display: "grid", gridTemplateRows: "auto auto", placeItems: "center", alignContent: "center", lineHeight: 1 }}><small style={{ fontSize: 5.8, color: "#8f98ad", fontWeight: 1000, letterSpacing: .45 }}>{ptit1Ui("SCORE LIVE","LIVE SCORE")}</small><b style={{ marginTop: 2, fontSize: 10.5, color: accent, fontWeight: 1100 }}>{liveScore}<span style={{ marginLeft: 3, fontSize: 6.5, color: liveDelta === 0 ? "#8791a4" : liveDelta < 0 ? GREEN : RED }}>{liveDelta === 0 ? "" : `${liveDelta > 0 ? "+" : ""}${liveDelta}`}</span></b></div>
  </div>;
}

function Ptit1ToolIcon({ kind, color = "#dfe8ff" }: any) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as any;
  if (kind === "ranking") return <svg {...common}><path d="M6 4h12v2l-3 3v4.5l-3 1.8-3-1.8V9L6 6V4Z"/><path d="M9 18h6"/><path d="M8 21h8"/></svg>;
  if (kind === "stats") return <svg {...common}><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20v-11"/></svg>;
  return <svg {...common}><path d="M6 7h12"/><path d="M6 12h12"/><path d="M6 17h8"/></svg>;
}

function Ptit1ProgressCard({ label, value, color = ACCENT, active = false, onClick }: any) {
  return <button type="button" onClick={onClick} style={{ minWidth: 0, borderRadius: 12, border: `1px solid ${color}${active ? "aa" : "66"}`, background: `linear-gradient(180deg,${color}${active ? "2b" : "18"},rgba(5,7,12,.96))`, boxShadow: active ? `0 0 18px ${color}22` : "none", padding: "7px 9px", color:"#fff", textAlign:"left", cursor:"pointer" }}><div style={{ color, fontSize: 7.6, fontWeight: 1100, letterSpacing: .6 }}>{label}</div><div style={{ marginTop: 3, color: "#fff", fontSize: 13.5, fontWeight: 1100 }}>{value}</div></button>;
}


function ptit1UiToGameDart(d: any) {
  try { return uiToGameDart(d); } catch { return null; }
}

function gameToUiDartForPtit1(d: any) {
  if (!d) return { v: 0, mult: 1 };
  if (d.bed === "MISS") return { v: 0, mult: 1 };
  if (d.bed === "IB") return { v: 25, mult: 2 };
  if (d.bed === "OB") return { v: 25, mult: 1 };
  if (d.bed === "D") return { v: Number(d.number || 0), mult: 2 };
  if (d.bed === "T") return { v: Number(d.number || 0), mult: 3 };
  if (d.bed === "S") return { v: Number(d.number || 0), mult: 1, label: d.ring === "outer_single" ? "outer_single" : "inner_single" };
  return { v: Number(d.number || 0), mult: Number(d.mult || 1) };
}

function ptit1IsInner(d: any) {
  return Boolean(d && d.bed === "S" && String(d.ring || "") === "inner_single" && Number(d.number) >= 1 && Number(d.number) <= 20);
}

function ptit1IsOuter(d: any) {
  return Boolean(d && d.bed === "S" && String(d.ring || "") === "outer_single" && Number(d.number) >= 1 && Number(d.number) <= 20);
}

function ptit1RawSteps(before: number, darts: any[], rules: any, opts: any = {}) {
  let running = Number(before || 0);
  let dbullOrdinal = Number(opts.dbullsBefore || 0);
  const zeroAlreadyUsed = Boolean(opts.zeroAlreadyUsed);
  let zeroTriggered = false;
  const shieldActive = Boolean(opts.shieldActive);
  const steps:any[] = [];

  for (let index = 0; index < (darts || []).length; index += 1) {
    const dart:any = darts[index]?.bed ? darts[index] : ptit1UiToGameDart(darts[index]);
    if (dart?.bed === "IB") dbullOrdinal += 1;
    const forceZeroAbsolute = Boolean(
      dart?.bed === "IB" &&
      rules.zeroAbsoluteEnabled &&
      !zeroAlreadyUsed &&
      !zeroTriggered &&
      dbullOrdinal >= Number(rules.dbullsForZero || 3)
    );
    const scored:any = scorePtitHunDart(running, dart, rules, {
      dbullOrdinal: dart?.bed === "IB" ? dbullOrdinal : undefined,
      forceZeroAbsolute,
    });
    let after = Number(scored.after || 0);
    let shieldSaved = 0;
    if (shieldActive && rules.shieldEnabled && ["outer","double","triple","bull25","miss"].includes(scored.kind) && scored.delta > 0) {
      const reduced = Math.ceil(scored.delta / Number(rules.shieldDivider || 2));
      after = running + reduced;
      shieldSaved = Math.max(0, scored.delta - reduced);
    }
    if (forceZeroAbsolute) zeroTriggered = true;
    steps.push({
      ...scored,
      dart,
      label: ptit1DisplayDartLabel(dart),
      before: running,
      rawAfter: scored.after,
      after,
      delta: after - running,
      dbullOrdinal: dart?.bed === "IB" ? dbullOrdinal : undefined,
      dbullDivisor: dart?.bed === "IB" && rules.dbullEnabled && !forceZeroAbsolute ? ptitHunDbullDivisor(rules, dbullOrdinal) : undefined,
      zeroAbsoluteNow: forceZeroAbsolute,
      shieldSaved,
    });
    running = Math.max(0, Math.round(after));
  }
  return steps;
}

function ptit1DraftProjection(state: any, playerId: string, uiDarts: any[]) {
  const rules = state?.config?.rules || {};
  const before = Number(state?.scores?.[playerId] ?? rules.startScore ?? 20);
  const gameDarts = (uiDarts || []).map(ptit1UiToGameDart).filter(Boolean);
  const dbullsBefore = Number(state?.statsByPlayer?.[playerId]?.dbulls || 0);
  const steps = ptit1RawSteps(before, gameDarts, rules, {
    dbullsBefore,
    zeroAlreadyUsed: Boolean(state?.zeroAbsoluteUsed?.[playerId]),
    shieldActive: Boolean(state?.shieldActive?.[playerId]),
  });
  let score = steps.length ? Number(steps[steps.length - 1].after) : before;
  const draftDbulls = gameDarts.filter((d:any) => d?.bed === "IB").length;
  const dbulls = dbullsBefore + draftDbulls;
  const zeroTriggered = steps.some((step:any)=>Boolean(step.zeroAbsoluteNow));
  const targets = Array.isArray(state?.jackpotTargets) ? state.jackpotTargets : [];
  const jackpot = Boolean(rules.jackpotEnabled && gameDarts.some((d:any) => targets.some((t:any) => String(t.bed) === String(d.bed) && Number(t.number) === Number(d.number))));
  const tripleNul = Boolean(gameDarts.length === 3 && rules.tripleNulEnabled && gameDarts.every(ptit1IsInner) && new Set(gameDarts.map((d:any)=>Number(d.number))).size === 1);

  // Jackpot / Triple Nul = retour au score du début de volée, sauf si ZÉRO ABSOLU a été déclenché.
  if (!zeroTriggered && (jackpot || tripleNul)) score = before;
  score = Math.max(0, Math.round(score));
  return { before, score, delta: score - before, dbulls, jackpot, tripleNul, zeroTriggered, steps };
}

function ptit1HitMeta(state: any, playerId: string, beforeUi: any[], addedUi: any) {
  const rules = state?.config?.rules || {};
  const beforeProjection = ptit1DraftProjection(state, playerId, beforeUi);
  const afterProjection = ptit1DraftProjection(state, playerId, [...beforeUi, addedUi]);
  const d:any = ptit1UiToGameDart(addedUi);
  const countDbullsBeforeDraft = beforeUi.map(ptit1UiToGameDart).filter((x:any)=>x?.bed === "IB").length;
  const totalDbullNo = Number(state?.statsByPlayer?.[playerId]?.dbulls || 0) + countDbullsBeforeDraft + (d?.bed === "IB" ? 1 : 0);
  const raw = scorePtitHunDart(beforeProjection.score, d, rules, {
    dbullOrdinal: d?.bed === "IB" ? totalDbullNo : undefined,
    forceZeroAbsolute: Boolean(d?.bed === "IB" && rules.zeroAbsoluteEnabled && !state?.zeroAbsoluteUsed?.[playerId] && totalDbullNo >= Number(rules.dbullsForZero || 3)),
  });
  let kind = "simple", title = "HIT", detail = `${beforeProjection.score} → ${afterProjection.score}`, color = ACCENT, icon = "•";
  if (!d || d.bed === "MISS") {
    kind="miss"; title="MISS";
    detail = rules.missMode === "add" ? `+${rules.missValue} · ${beforeProjection.score} → ${afterProjection.score}` : `TOTAL ×${rules.missValue} · ${beforeProjection.score} → ${afterProjection.score}`;
    color=RED; icon="✕";
  } else if (d.bed === "IB") {
    kind = totalDbullNo >= Number(rules.dbullsForZero || 3) && rules.zeroAbsoluteEnabled && !state?.zeroAbsoluteUsed?.[playerId] ? "zero" : "dbull";
    title = kind === "zero" ? `BULL50 ×${totalDbullNo} · ${ptit1Ui("ZÉRO ABSOLU","ABSOLUTE ZERO")}` : `BULL50 ×${totalDbullNo}`;
    const divisor = ptitHunDbullDivisor(rules, totalDbullNo);
    detail = kind === "zero"
      ? ptit1Ui("BONUS · SCORE = 0 immédiatement","BONUS · SCORE = 0 immediately")
      : `${totalDbullNo === 2 ? ptit1Ui("2e DBULL cumulé · ","2nd cumulative DBULL · ") : ""}${ptit1Ui("score courant","current score")} ÷${divisor} · ${beforeProjection.score} → ${afterProjection.score}`;
    color=BLUE; icon=kind === "zero" ? "0" : "◎";
  } else if (d.bed === "OB") {
    const pts = 25 * Number(rules.bull25Factor || 4);
    kind="bull25"; title="BULL25"; detail=`25 ×${rules.bull25Factor} = +${pts} · ${beforeProjection.score} → ${afterProjection.score}`; color="#ff9e5c"; icon="◉";
  } else if (d.bed === "D") {
    const base = Number(d.number || 0) * 2, pts = base * Number(rules.doubleFactor || 2);
    kind="double"; title=`DOUBLE ${d.number}`; detail=`${base} ×${rules.doubleFactor} = +${pts} · ${beforeProjection.score} → ${afterProjection.score}`; color="#68d9ff"; icon="D";
  } else if (d.bed === "T") {
    const base = Number(d.number || 0) * 3, pts = base * Number(rules.tripleFactor || 3);
    kind="triple"; title=`TRIPLE ${d.number}`; detail=`${base} ×${rules.tripleFactor} = +${pts} · ${beforeProjection.score} → ${afterProjection.score}`; color="#df72ff"; icon="T";
  } else if (ptit1IsOuter(d)) {
    const pts = Number(d.number || 0) * Number(rules.outerSingleFactor || 10);
    kind="outer"; title=`${ptit1Ui("GROS","BIG")} ${d.number}`; detail=`${d.number} ×${rules.outerSingleFactor} = +${pts} · ${beforeProjection.score} → ${afterProjection.score}`; color="#ff8b22"; icon="G";
  } else if (ptit1IsInner(d)) {
    kind="inner"; title=`${ptit1Ui("PETIT","SMALL")} ${d.number}`; detail=`+${d.number} · ${beforeProjection.score} → ${afterProjection.score}`; color="#ffe36c"; icon="P";
  }
  const visitDarts = [...beforeUi, addedUi].map(ptit1UiToGameDart).filter(Boolean);
  const tripleNulNow = Boolean(
    rules.tripleNulEnabled &&
    visitDarts.length === 3 &&
    visitDarts.every(ptit1IsInner) &&
    new Set(visitDarts.map((x:any) => Number(x.number))).size === 1
  );
  if (tripleNulNow) {
    const n = Number(visitDarts[0]?.number || 0);
    kind = n === 1 ? "ptit1Perfect" : "tripleNul";
    title = n === 1 ? ptit1Ui("P’TIT 1 PARFAIT","PERFECT P’TIT 1") : `${ptit1Ui("TRIPLE NUL","TRIPLE ZERO")} · ${ptit1Ui("PETIT","SMALL")} ${n}`;
    detail = `3 × ${ptit1Ui("PETIT","SMALL")} ${n} · ${ptit1Ui("VOLÉE","VISIT")} = 0 · ${beforeProjection.score} → ${afterProjection.score}`;
    color = n === 1 ? "#ffe36c" : GREEN;
    icon = n === 1 ? "1" : "0";
  }
  const jackpot = rules.jackpotEnabled && (state?.jackpotTargets||[]).some((t:any)=>String(t.bed)===String(d?.bed) && Number(t.number)===Number(d?.number));
  if (jackpot) { kind="jackpot"; title=`JACKPOT ${d.bed}${d.number}`; detail=`${ptit1Ui("VOLÉE","VISIT")} = 0`; color="#ffd84d"; icon="✦"; }
  return { kind, title, detail, color, icon, score: afterProjection.score, delta: afterProjection.delta, dbullNo: totalDbullNo, rawDelta: raw.delta };
}

function ptit1VisitBreakdown(visit: any, rules: any) {
  if (!visit) return [];
  const recorded = Array.isArray(visit?.dartSteps) && visit.dartSteps.length ? visit.dartSteps : ptit1RawSteps(Number(visit.before || 0), visit.darts || [], rules, { dbullsBefore: Number(visit?.dbullsBefore || 0), shieldActive: Boolean(visit?.shieldBefore) });
  return recorded.map((step:any) => ({
    label: step.label,
    delta: Number(step.delta || 0),
    before: step.before,
    after: step.after,
    kind: step.kind,
  }));
}

function Ptit1HitCard({ card }: any) {
  if (!card) return null;
  return <div className="ptit1-hit-card" style={{ ["--hit-color" as any]: card.color }} aria-live="polite">
    <div className="ptit1-hit-card__icon">{card.icon}</div>
    <div><small>{card.kind === "jackpot" ? "BONUS" : card.kind === "miss" ? ptit1Ui("MALUS","PENALTY") : "IMPACT"}</small><b>{card.title}</b><span>{card.detail}</span></div>
    <strong>{card.score}</strong>
  </div>;
}

function Ptit1VisitCard({ card, profile }: any) {
  if (!card) return null;
  return <div className="ptit1-visit-card" aria-live="polite">
    <div className="ptit1-visit-card__avatar"><ProfileAvatar profile={profile} size={52} showStars={false} ringColor={card.color || ACCENT} /></div>
    <div className="ptit1-visit-card__copy"><small>{card.specialLabel || ptit1Ui("VOLÉE TERMINÉE","VISIT COMPLETE")}</small><b>{card.playerName}</b><div className="ptit1-visit-card__darts">{(card.breakdown||[]).map((step:any,i:number)=><span key={i} title={`${step.before} → ${step.after}`}>{ptit1DisplaySavedLabel(step.label)}<i>{step.delta===0?"0":`${step.delta>0?"+":""}${step.delta}`}</i></span>)}</div></div>
    <div className="ptit1-visit-card__score"><small>{ptit1Ui("VOLÉE","VISIT")}</small><b>{card.delta === 0 ? "0" : `${card.delta > 0 ? "+" : ""}${card.delta}`}</b><span>TOTAL {card.after}</span></div>
  </div>;
}

function Ptit1PlayersModal({ rows, onClose }: any) {
  return <FloatingPanel title={ptit1Ui("ORDRE DE JEU","PLAY ORDER")} subtitle={ptit1Ui("Dernière volée, score et progression de chaque joueur","Last visit, score and progress for every player")} onClose={onClose} accent={ACCENT}>
    <div style={{display:"grid",gap:8,padding:2}}>{(rows||[]).map((row:any,index:number)=><div key={row.id||index} style={{borderRadius:15,border:`1px solid ${row.active ? row.color+"aa" : "rgba(255,255,255,.08)"}`,background:"linear-gradient(180deg,rgba(255,255,255,.04),rgba(0,0,0,.20))",padding:8,boxShadow:row.active?`0 0 18px ${row.color}22`:"none"}}>
      <div style={{display:"grid",gridTemplateColumns:"24px 42px minmax(0,1fr) auto",gap:7,alignItems:"center"}}><strong style={{color:row.color,fontSize:10}}>#{index+1}</strong><ProfileAvatar profile={row.profile} size={40} showStars={false} ringColor={row.color}/><div style={{minWidth:0}}><b style={{display:"block",color:row.color,fontSize:10,textTransform:"uppercase",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{row.name}</b><span style={{display:"block",marginTop:2,color:"#8792a8",fontSize:7.5}}>{row.status}</span></div><b style={{fontSize:18,color:row.color}}>{row.score}</b></div>
      <div style={{marginTop:7,display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr)) auto",gap:5,alignItems:"stretch"}}>{[0,1,2].map((i)=>{const step=row.lastBreakdown?.[i];return <div key={i} style={{height:32,borderRadius:9,border:"1px solid rgba(255,255,255,.08)",background:"rgba(0,0,0,.26)",display:"grid",gridTemplateRows:"auto auto",placeItems:"center",alignContent:"center",color:step?"#fff":"#667085",fontWeight:1000,lineHeight:1}}>{step?<><span style={{fontSize:7.8}}>{ptit1DisplaySavedLabel(step.label)}</span><small style={{marginTop:2,fontSize:6.2,color:step.delta<0?GREEN:step.kind==="miss"?RED:row.color}}>{step.delta===0?"0":`${step.delta>0?"+":""}${step.delta}`}</small></>:"—"}</div>})}<div style={{minWidth:64,borderRadius:9,border:`1px solid ${row.color}44`,background:`${row.color}0d`,display:"grid",placeItems:"center",textAlign:"center",padding:"2px 7px"}}><small style={{color:"#8f98ad",fontSize:6.5}}>{ptit1Ui("DERNIÈRE","LAST")}</small><b style={{color:row.color,fontSize:10}}>{row.lastVisit ? `${row.lastVisit.delta>0?"+":""}${row.lastVisit.delta}` : "—"}</b></div></div>
    </div>)}</div>
  </FloatingPanel>;
}


function Ptit1FinalDashboard({ state, rankingRows, colorById, nameById }: any) {
  const fr = ptit1IsFrench();
  const rows = (rankingRows || []).map((r:any) => {
    const st:any = state.statsByPlayer?.[r.id] || {};
    const darts = Number(st.darts || 0);
    const inner = Number(st.innerSingles || 0);
    const saved = Number(st.dbullSaved || 0) + Number(st.shieldSaved || 0) + Number(st.jackpotSaved || 0) + Number(st.tripleNulSaved || 0);
    return { ...r, st, darts, inner, innerPct: darts ? Math.round(inner / darts * 1000) / 10 : 0, saved };
  });
  const visits:any[] = Array.isArray(state.visits) ? state.visits : [];
  const start = Number(state.config?.rules?.startScore || 20);
  const hitSeries = rows.map((row:any) => {
    const pv = visits.filter((v:any)=>String(v.playerId)===String(row.id));
    const points:any[] = [{ after:start, event:"start", label:fr ? "Départ" : "Start" }];
    for (const visit of pv) {
      const steps = Array.isArray(visit?.dartSteps) ? visit.dartSteps : [];
      if (steps.length) {
        for (const step of steps) {
          points.push({
            after:Number(step?.after || 0),
            event:step?.zeroAbsoluteNow ? "zero" : step?.kind === "dbull" ? "dbull" : step?.kind === "miss" ? "miss" : "",
            label:String(step?.label || ""),
          });
        }
        const lastStepScore = Number(steps[steps.length - 1]?.after || 0);
        if (Number(visit?.after || 0) !== lastStepScore) {
          points.push({
            after:Number(visit?.after || 0),
            event:visit?.jackpotHit ? "jackpot" : visit?.petitOnePerfect ? "perfect" : visit?.tripleNul ? "tripleNul" : "rollback",
            label:visit?.jackpotHit ? "Jackpot" : visit?.petitOnePerfect ? (fr ? "P’TIT 1 parfait" : "Perfect P’TIT 1") : visit?.tripleNul ? (fr ? "Triple Nul" : "Triple Zero") : (fr ? "Fin de volée" : "End of visit"),
          });
        }
      } else {
        points.push({
          after:Number(visit?.after || 0),
          event:visit?.zeroAbsoluteNow ? "zero" : visit?.jackpotHit ? "jackpot" : visit?.tripleNul ? "tripleNul" : "",
          label:fr ? "Fin de volée" : "End of visit",
        });
      }
      if (visit?.shieldUnlockedNow) {
        points.push({ after:Number(visit?.after || 0), event:"shield", label:fr ? "Bouclier du Hun" : "Hun Shield" });
      }
    }
    return { row, points };
  });
  const maxPointIndex = Math.max(1, ...hitSeries.map((serie:any)=>Math.max(0, serie.points.length - 1)));
  const allScores = hitSeries.flatMap((serie:any)=>serie.points.map((p:any)=>Number(p.after || 0)));
  const minScore = Math.min(...allScores, 0);
  const maxScore = Math.max(...allScores, start, 1);
  const yFor = (score:number) => 18 + ((maxScore - score) / Math.max(1, maxScore - minScore)) * 164;
  const xFor = (idx:number) => 36 + (idx / maxPointIndex) * 824;
  const eventMoments = visits.flatMap((visit:any, visitIndex:number) => {
    const out:any[] = [];
    const base = {
      id:String(visit?.id || `event-${visitIndex}`),
      playerId:String(visit?.playerId || ""),
      turn:Number(visit?.turn || 0),
      score:Number(visit?.after || 0),
      visitIndex,
    };
    if (visit?.zeroAbsoluteNow) out.push({ ...base, key:`${base.id}-zero`, icon:"💎", label:fr ? "ZÉRO ABSOLU" : "ABSOLUTE ZERO", tone:BLUE });
    if (visit?.shieldUnlockedNow) out.push({ ...base, key:`${base.id}-shield`, icon:"🛡", label:fr ? "BOUCLIER DU HUN" : "HUN SHIELD", tone:GREEN });
    if (visit?.jackpotHit) out.push({ ...base, key:`${base.id}-jackpot`, icon:"✦", label:"JACKPOT", tone:"#ffd84d" });
    if (visit?.petitOnePerfect) out.push({ ...base, key:`${base.id}-perfect`, icon:"1️⃣", label:fr ? "P’TIT 1 PARFAIT" : "PERFECT P’TIT 1", tone:ACCENT });
    else if (visit?.tripleNul) out.push({ ...base, key:`${base.id}-tn`, icon:"🎯", label:`${fr ? "TRIPLE NUL" : "TRIPLE ZERO"} ${visit?.tripleNulNumber || ""}`.trim(), tone:GREEN });
    if (visit?.zeroPenaltyFloor) out.push({ ...base, key:`${base.id}-danger`, icon:"⚠️", label:fr ? "MISS À 0" : "MISS AT 0", tone:RED });
    return out;
  });
  const totalDarts = rows.reduce((a:number,r:any)=>a+r.darts,0);
  const totalZero = rows.reduce((a:number,r:any)=>a+Number(r.st.zeroVisits||0),0);
  const totalSaved = rows.reduce((a:number,r:any)=>a+r.saved,0);
  const totalInner = rows.reduce((a:number,r:any)=>a+r.inner,0);
  const globalInnerPct = totalDarts ? Math.round(totalInner/totalDarts*1000)/10 : 0;
  const maxBy = (fn:any) => rows.reduce((best:any,row:any)=>!best || fn(row)>fn(best)?row:best,null);
  const sniper = maxBy((r:any)=>Number(r.st.tripleNuls||0));
  const kamikaze = maxBy((r:any)=>Number(r.st.missDamage||0)+Number(r.st.bull25Damage||0));
  const center = maxBy((r:any)=>Number(r.st.dbullSaved||0));
  const jackpot = maxBy((r:any)=>Number(r.st.jackpotSaved||0));
  const shield = maxBy((r:any)=>Number(r.st.shieldSaved||0));
  const zoneTotal = (st:any) => Math.max(1, Number(st.innerSingles||0)+Number(st.outerSingles||0)+Number(st.doubles||0)+Number(st.triples||0)+Number(st.bulls25||0)+Number(st.dbulls||0)+Number(st.misses||0));
  const zoneParts = (st:any) => [
    ["PETIT",Number(st.innerSingles||0),"#f2c84b"],
    ["GROS",Number(st.outerSingles||0),"#ff9b55"],
    ["D",Number(st.doubles||0),"#65d8ff"],
    ["T",Number(st.triples||0),"#d780ff"],
    ["25",Number(st.bulls25||0),"#ff7b72"],
    ["50",Number(st.dbulls||0),"#78f3d4"],
    ["MISS",Number(st.misses||0),"#ff5570"],
  ];
  return <section style={{ display:"grid", gap:10, padding:"0 10px 14px" }}>
    <div style={{ border:`1px solid ${ACCENT}55`, borderRadius:18, padding:12, background:"radial-gradient(circle at 50% 0%,rgba(242,200,75,.11),transparent 42%),linear-gradient(180deg,rgba(14,16,23,.98),rgba(5,7,11,.99))" }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"baseline", flexWrap:"wrap" }}>
        <div><b style={{ color:ACCENT, fontSize:14, letterSpacing:1 }}>{fr ? "TABLEAU FINAL · P’TIT 1 LAB" : "FINAL DASHBOARD · P’TIT 1 LAB"}</b><div style={{ color:"#99a2b5", fontSize:9, marginTop:3 }}>{fr ? "Le match disséqué : risque, précision, bonus et trajectoire du score." : "The match broken down: risk, precision, bonuses and score trajectory."}</div></div>
        <div style={{ color:"#fff", fontSize:10, fontWeight:900 }}>{rows[0] ? `👑 ${rows[0].name} · ${rows[0].score} pts` : ""}</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(125px,1fr))", gap:7, marginTop:10 }}>
        {[
          [fr ? "FLÉCHETTES" : "DARTS",totalDarts,"#fff"],
          [fr ? "PETITS SIMPLES" : "SMALL SINGLES",`${globalInnerPct}%`,GREEN],
          [fr ? "VOLÉES À 0" : "ZERO VISITS",totalZero,ACCENT],
          [fr ? "POINTS EFFACÉS / SAUVÉS" : "POINTS ERASED / SAVED",totalSaved,BLUE],
        ].map(([label,value,color]:any)=><div key={label} style={{ borderRadius:12,padding:9,border:"1px solid rgba(255,255,255,.08)",background:"rgba(255,255,255,.025)",textAlign:"center" }}><small style={{ color:"#818ba0",fontSize:7,fontWeight:1000 }}>{label}</small><b style={{ display:"block",marginTop:3,color,fontSize:20 }}>{value}</b></div>)}
      </div>
    </div>

    <div style={{ border:"1px solid rgba(255,255,255,.08)", borderRadius:18, padding:10, background:"rgba(7,9,14,.96)" }}>
      <div style={{ color:ACCENT,fontSize:11,fontWeight:1100,letterSpacing:.8,marginBottom:7 }}>{fr ? "📈 TRAJECTOIRE DU SCORE · HIT APRÈS HIT" : "📈 SCORE TRAJECTORY · HIT BY HIT"}</div>
      <div style={{ width:"100%", overflowX:"auto" }}>
        <svg viewBox="0 0 900 210" style={{ width:"100%", minWidth:620, display:"block", borderRadius:12, background:"linear-gradient(180deg,rgba(255,255,255,.025),rgba(0,0,0,.16))" }}>
          {[0,.25,.5,.75,1].map((t,i)=><line key={i} x1="34" x2="874" y1={18+t*164} y2={18+t*164} stroke="rgba(255,255,255,.07)" strokeWidth="1"/>)}
          {hitSeries.map((serie:any)=>{
            const row=serie.row;
            const pts=serie.points;
            const points=pts.map((v:any,idx:number)=>`${xFor(idx)},${yFor(Number(v.after||0))}`).join(" ");
            const color=colorById.get(String(row.id))||ACCENT;
            return <g key={`line-${row.id}`}>
              <polyline points={points} fill="none" stroke={color} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>
              {pts.map((v:any,idx:number)=>{
                const eventColor = v.event === "zero" ? BLUE : v.event === "shield" ? GREEN : v.event === "miss" ? RED : v.event === "jackpot" || v.event === "perfect" ? "#ffd84d" : color;
                const special = Boolean(v.event && v.event !== "start");
                return <circle key={idx} cx={xFor(idx)} cy={yFor(Number(v.after||0))} r={special ? 4.6 : idx===pts.length-1 ? 5 : 2.2} fill={eventColor} stroke={special ? "#fff" : "none"} strokeWidth={special ? 1 : 0}><title>{v.label ? `${row.name} · ${v.label} · ${v.after}` : `${row.name} · ${v.after}`}</title></circle>;
              })}
            </g>;
          })}
          <text x="8" y="22" fill="#8690a3" fontSize="10">{maxScore}</text>
          <text x="8" y="184" fill="#8690a3" fontSize="10">{minScore}</text>
          <text x="36" y="202" fill="#8690a3" fontSize="9">{fr ? "Départ" : "Start"}</text>
          <text x="838" y="202" fill="#8690a3" fontSize="9">{fr ? "Fin" : "End"}</text>
        </svg>
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:6 }}>{rows.map((r:any)=><span key={`legend-${r.id}`} style={{ color:colorById.get(String(r.id))||ACCENT,fontSize:8,fontWeight:1000 }}>● {r.name}</span>)}</div>
    </div>

    {eventMoments.length ? <div style={{ border:"1px solid rgba(255,255,255,.08)", borderRadius:18, padding:10, background:"rgba(7,9,14,.96)" }}>
      <div style={{ color:ACCENT,fontSize:11,fontWeight:1100,letterSpacing:.8,marginBottom:7 }}>{fr ? "⚡ MOMENTS QUI ONT RETOURNÉ LA PARTIE" : "⚡ MATCH-CHANGING MOMENTS"}</div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:7 }}>
        {eventMoments.slice(-12).map((event:any)=>{
          const player = rows.find((r:any)=>String(r.id)===String(event.playerId));
          return <div key={event.key} style={{ borderRadius:12,padding:"8px 9px",border:`1px solid ${event.tone}55`,background:`${event.tone}0d`,minWidth:0 }}>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}><span style={{ fontSize:16 }}>{event.icon}</span><b style={{ color:event.tone,fontSize:9,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{event.label}</b></div>
            <div style={{ marginTop:4,color:"#fff",fontSize:9,fontWeight:900,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{player?.name || nameById(event.playerId)}</div>
            <div style={{ marginTop:2,color:"#8792a8",fontSize:7.5 }}>{fr ? "Volée" : "Visit"} {event.turn} · total {event.score}</div>
          </div>;
        })}
      </div>
    </div> : null}

    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:8 }}>
      {[
        [fr ? "🎯 SNIPER TRIPLE NUL" : "🎯 TRIPLE ZERO SNIPER",sniper,`${sniper?.st?.tripleNuls||0} ${fr ? "Triple Nul" : "Triple Zero"}`],
        ["💥 KAMIKAZE",kamikaze,`${Number(kamikaze?.st?.missDamage||0)+Number(kamikaze?.st?.bull25Damage||0)} ${fr ? "pts de casse" : "damage pts"}`],
        [fr ? "💎 DOMPTEUR DBULL" : "💎 DBULL TAMER",center,`${center?.st?.dbullSaved||0} ${fr ? "pts retirés" : "pts removed"}`],
        [fr ? "✦ BRAQUEUR JACKPOT" : "✦ JACKPOT ROBBER",jackpot,`${jackpot?.st?.jackpotSaved||0} ${fr ? "pts annulés" : "pts cancelled"}`],
        [fr ? "🛡 MAÎTRE DU BOUCLIER" : "🛡 SHIELD MASTER",shield,`${shield?.st?.shieldSaved||0} ${fr ? "pts sauvés" : "pts saved"}`],
      ].map(([label,row,value]:any)=><div key={label} style={{ borderRadius:14,padding:10,border:`1px solid ${(row?.color||ACCENT)}44`,background:"rgba(255,255,255,.025)" }}><small style={{ color:"#8d96a8",fontSize:7,fontWeight:1000 }}>{label}</small><b style={{ display:"block",marginTop:3,color:row?.color||ACCENT,fontSize:12,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{row?.name||"—"}</b><span style={{ display:"block",marginTop:2,color:"#fff",fontSize:9 }}>{value}</span></div>)}
    </div>

    <div style={{ border:"1px solid rgba(255,255,255,.08)",borderRadius:18,padding:10,background:"rgba(7,9,14,.96)" }}>
      <div style={{ color:ACCENT,fontSize:11,fontWeight:1100,letterSpacing:.8,marginBottom:8 }}>{fr ? "🎨 PROFIL DE RISQUE PAR JOUEUR" : "🎨 RISK PROFILE BY PLAYER"}</div>
      <div style={{ display:"grid",gap:8 }}>{rows.map((row:any)=>{
        const total=zoneTotal(row.st); const parts=zoneParts(row.st);
        return <div key={`risk-${row.id}`} style={{ display:"grid",gridTemplateColumns:"minmax(90px,150px) minmax(0,1fr) 58px",gap:8,alignItems:"center" }}>
          <b style={{ color:row.color||ACCENT,fontSize:9,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{row.name}</b>
          <div style={{ height:14,borderRadius:999,overflow:"hidden",display:"flex",background:"rgba(255,255,255,.05)" }}>{parts.map(([label,count,color]:any)=><i key={label} title={`${label}: ${count}`} style={{ width:`${count/total*100}%`,background:color,minWidth:count?2:0 }} />)}</div>
          <span style={{ color:GREEN,fontSize:8,fontWeight:1000,textAlign:"right" }}>{row.innerPct}% P</span>
        </div>;
      })}</div>
      <div style={{ display:"flex",gap:10,flexWrap:"wrap",marginTop:8 }}>{zoneParts({innerSingles:1,outerSingles:1,doubles:1,triples:1,bulls25:1,dbulls:1,misses:1}).map(([l,_c,c]:any)=><span key={l} style={{ color:c,fontSize:7.5,fontWeight:1000 }}>■ {l}</span>)}</div>
    </div>

    <div style={{ border:"1px solid rgba(255,255,255,.08)",borderRadius:18,overflow:"hidden",background:"rgba(7,9,14,.96)" }}>
      <div style={{ padding:"10px 11px",color:ACCENT,fontSize:11,fontWeight:1100,letterSpacing:.8 }}>{fr ? "🏁 CLASSEMENT & STATS CLÉS" : "🏁 RANKING & KEY STATS"}</div>
      <div style={{ overflowX:"auto" }}><table style={{ width:"100%",borderCollapse:"collapse",minWidth:900,fontSize:9 }}>
        <thead><tr style={{ color:"#9ca6b8",textAlign:"left" }}>{(fr ? ["#","Joueur","Score","Min / Max","Petit %","Triple Nul","P’tit 1 parfait","DBULL","Jackpot","MISS","Pts retirés DBULL","Pts sauvés bouclier"] : ["#","Player","Score","Min / Max","Small %","Triple Zero","Perfect P’TIT 1","DBULL","Jackpot","MISS","DBULL pts removed","Shield pts saved"]).map(h=><th key={h} style={{ padding:"7px 8px",borderTop:"1px solid rgba(255,255,255,.06)",borderBottom:"1px solid rgba(255,255,255,.06)" }}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r:any,index:number)=><tr key={`final-row-${r.id}`} style={{ borderBottom:"1px solid rgba(255,255,255,.05)" }}>
          <td style={{ padding:"8px",color:index===0?ACCENT:"#fff",fontWeight:1100 }}>{index+1}</td>
          <td style={{ padding:"8px",color:r.color||ACCENT,fontWeight:1000 }}>{r.name}</td>
          <td style={{ padding:"8px",fontWeight:1100 }}>{r.score}</td>
          <td style={{ padding:"8px" }}>{r.st.lowestScore ?? "—"} / {r.st.highestScore ?? "—"}</td>
          <td style={{ padding:"8px" }}>{r.innerPct}%</td>
          <td style={{ padding:"8px" }}>{r.st.tripleNuls||0}</td>
          <td style={{ padding:"8px" }}>{r.st.petitOneTriples||0}</td>
          <td style={{ padding:"8px" }}>{r.st.dbulls||0}</td>
          <td style={{ padding:"8px" }}>{r.st.jackpotVisits||0}</td>
          <td style={{ padding:"8px",color:(r.st.misses||0)>0?RED:"#fff" }}>{r.st.misses||0}</td>
          <td style={{ padding:"8px",color:BLUE }}>{r.st.dbullSaved||0}</td>
          <td style={{ padding:"8px",color:GREEN }}>{r.st.shieldSaved||0}</td>
        </tr>)}</tbody>
      </table></div>
    </div>
  </section>;
}


export default function PtitHunPlay(props: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: true });
  const fr = ptit1IsFrench();
  const awena = useAwenaOptional();
  const go = props?.go ?? props?.setTab;
  const store = props?.store;
  const onFinish = props?.onFinish;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const config = React.useMemo(() => normalizePtitHunConfig(props?.params?.config || resumeRecord?.resume?.config || resumeRecord?.payload?.config || {}), []);
  const profiles = React.useMemo(() => resolveModeProfiles(config, store), [config, store]);
  const players = React.useMemo(() => profiles.map((p: any, i: number) => ({ id: String(p.id || `p${i + 1}`), name: playerName(p, i) })), [profiles]);
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);
  const restored = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || resumeRecord?.payload?.state || null;
  const recoveredThrow = resumeRecord?.resume?.currentThrow ?? resumeRecord?.payload?.currentThrow;
  const recoveredSingleRing = resumeRecord?.resume?.singleRing ?? resumeRecord?.payload?.singleRing;
  const recoveredUndoStack = resumeRecord?.resume?.undoStack ?? resumeRecord?.payload?.undoStack;
  const [state, setState] = React.useState<PtitHunState>(() => restored?.mode === "ptit_hun" ? clonePtitHunState(restored) : createPtitHunState(players, config));
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>(() => Array.isArray(recoveredThrow) ? recoveredThrow.slice(0, 3) : []);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(() => { const v = resumeRecord?.resume?.multiplier ?? resumeRecord?.payload?.multiplier; return v === 2 || v === 3 ? v : 1; });
  const [singleRing, setSingleRing] = React.useState<"inner_single" | "outer_single" | null>(recoveredSingleRing === "outer_single" ? "outer_single" : recoveredSingleRing === "inner_single" ? "inner_single" : null);
  const [undo, setUndo] = React.useState<PtitHunState[]>(() => Array.isArray(recoveredUndoStack) ? recoveredUndoStack.filter((snap: any) => snap?.mode === "ptit_hun").slice(-3).map((snap: any) => clonePtitHunState(snap)) : []);
  const [notice, setNotice] = React.useState("");
  const [moment, setMoment] = React.useState<any>(null);
  const [hitCard, setHitCard] = React.useState<any>(null);
  const [visitCard, setVisitCard] = React.useState<any>(null);
  const [playersOpen, setPlayersOpen] = React.useState(false), [statsOpen, setStatsOpen] = React.useState(false), [logOpen, setLogOpen] = React.useState(false), [rankingOpen, setRankingOpen] = React.useState(false), [focusOpen, setFocusOpen] = React.useState(false), [zeroOpen, setZeroOpen] = React.useState(false), [shieldOpen, setShieldOpen] = React.useState(false), [specialOpen, setSpecialOpen] = React.useState(false);
  const botBusy = React.useRef(false), finishedRef = React.useRef(false), introPlayedRef = React.useRef(false), initialCheckpointRef = React.useRef(false);
  React.useEffect(() => { if (!hitCard) return; const t=window.setTimeout(()=>setHitCard(null), 1250); return ()=>window.clearTimeout(t); }, [hitCard?.key]);
  React.useEffect(() => { if (!visitCard) return; const t=window.setTimeout(()=>setVisitCard(null), 2450); return ()=>window.clearTimeout(t); }, [visitCard?.key]);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `ptit1-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const profileById = React.useMemo(() => new Map(profiles.map((p: any) => [String(p.id), p])), [profiles]);
  const colorById = React.useMemo(() => modePlayerColors(state.players, ACCENT), [state.players]);
  const activePlayer = state.players[state.activePlayerIndex];
  const activeProfile = activePlayer ? profileById.get(String(activePlayer.id)) || activePlayer : null;
  const activeColor = activePlayer ? colorById.get(String(activePlayer.id)) || ACCENT : ACCENT;
  const activeTeamLogo = activeProfile?.teamLogoDataUrl || activeProfile?.team?.logoDataUrl || activeProfile?.teamLogo || activeProfile?.team?.logo || null;
  const activeTeamName = activeProfile?.teamName || activeProfile?.team?.name || activeProfile?.team_label || "";
  const activeIsBot = !!activeProfile && isBotProfile(activeProfile, botIds);
  const [sfxEnabled, setSfxEnabled] = React.useState(config.sfxEnabled !== false);
  const awenaEnabled = config.awenaEnabled !== false, coachEnabled = config.coachEnabled !== false, firstVisitGuideEnabled = config.firstVisitGuide !== false;
  const nameById = React.useCallback((id: any) => state.players.find((p: any) => String(p.id) === String(id))?.name || "Joueur", [state.players]);

  const buildRecord = React.useCallback((s: PtitHunState, status: "in_progress" | "finished", draft: UIDart[] = currentThrow, draftMultiplier: 1 | 2 | 3 = multiplier, ring = singleRing, resumeUndo: PtitHunState[] = undo) => {
    const rows = profiles.map((p: any) => ({ id: String(p.id), name: playerName(p), avatarDataUrl: p.avatarDataUrl ?? null }));
    const rankings = rankPtitHunPlayers(s).map((r: any) => {
      const p: any = s.players.find((x: any) => String(x.id) === String(r.id)); const st: any = s.statsByPlayer?.[r.id] || {};
      return { id: r.id, name: p?.name || (fr ? "Joueur" : "Player"), rank: r.rank, score: r.score, tripleNuls: st.tripleNuls || 0, petitOneHits: st.petitOneHits || 0, petitOneTriples: st.petitOneTriples || 0, zeroVisits: st.zeroVisits || 0, jackpotVisits: st.jackpotVisits || 0, jackpotHits: st.jackpotHits || 0, dbulls: st.dbulls || 0, cleanVisits: st.cleanVisits || 0, shield: !!s.shieldActive?.[r.id] };
    });
    const perPlayer = Object.fromEntries((s.players || []).map((p: any) => [p.id, { ...(s.statsByPlayer?.[p.id] || {}), score: Number(s.scores?.[p.id] || 0), shield: !!s.shieldActive?.[p.id], cleanStreak: Number(s.cleanStreak?.[p.id] || 0), zeroAbsoluteUsed: !!s.zeroAbsoluteUsed?.[p.id] }]));
    return {
      id: matchIdRef.current, matchId: matchIdRef.current, resumeId: matchIdRef.current, kind: "ptit_hun", mode: "ptit_hun", sport: "darts", status,
      createdAt: s.startedAt, updatedAt: Date.now(), finishedAt: status === "finished" ? (s.finishedAt || Date.now()) : undefined, winnerId: s.winnerId, players: rows,
      game: { mode: "ptit_hun", rounds: s.config.rules.rounds, startScore: s.config.rules.startScore },
      summary: { mode: "ptit_hun", finished: status === "finished", winnerId: s.winnerId, finalScores: s.scores, rankings, perPlayer, config: s.config, durationMs: Math.max(0, Number((status === "finished" ? (s.finishedAt || Date.now()) : Date.now())) - Number(s.startedAt || Date.now())), totalDarts: Object.values(s.statsByPlayer || {}).reduce((a: number, r: any) => a + Number(r?.darts || 0), 0) },
      resume: { mode: "ptit_hun", config: s.config, state: clonePtitHunState(s), currentThrow: draft.slice(0, 3), multiplier: draftMultiplier, singleRing: ring, undoStack: resumeUndo.slice(-3).map((snap) => clonePtitHunState(snap)), updatedAt: Date.now() },
      payload: { kind: "ptit_hun", mode: "ptit_hun", sport: "darts", config: s.config, stateSnapshot: clonePtitHunState(s), currentThrow: draft.slice(0, 3), multiplier: draftMultiplier, singleRing: ring, undoStack: resumeUndo.slice(-3).map((snap) => clonePtitHunState(snap)), visits: s.visits, visitHistory: s.visits, stats: { mode: "ptit_hun", players: s.statsByPlayer, finalScores: s.scores } },
    };
  }, [profiles, currentThrow, multiplier, singleRing, undo]);

  const saveInProgress = React.useCallback(async (s: PtitHunState, draft: UIDart[] = currentThrow, m: 1 | 2 | 3 = multiplier, ring = singleRing, resumeUndo: PtitHunState[] = undo) => { try { await History.upsert(buildRecord(s, "in_progress", draft, m, ring, resumeUndo)); } catch (e) { console.warn("[PTIT_HUN] checkpoint failed", e); } }, [buildRecord, currentThrow, multiplier, singleRing, undo]);
  const persist = React.useCallback((s: PtitHunState, resumeUndo: PtitHunState[] = undo) => {
    if (s.phase === "finished") {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const rec = buildRecord(s, "finished", [], 1, singleRing, resumeUndo);
      if (typeof onFinish === "function") onFinish(rec, { navigate: false }); else void History.upsert(rec).catch(() => {});
    } else void saveInProgress(s, [], 1, singleRing, resumeUndo);
  }, [buildRecord, onFinish, saveInProgress, singleRing, undo]);

  React.useEffect(() => { if (initialCheckpointRef.current) return; initialCheckpointRef.current = true; if (state.phase !== "finished") void saveInProgress(state, currentThrow, multiplier, singleRing); }, [saveInProgress, state, currentThrow, multiplier, singleRing]);
  React.useEffect(() => { if (state.phase === "finished") return; const t = window.setTimeout(() => void saveInProgress(state, currentThrow, multiplier, singleRing), 180); return () => window.clearTimeout(t); }, [currentThrow, multiplier, singleRing, state.phase, state.activePlayerIndex, saveInProgress]);
  React.useEffect(() => { if (restored?.mode === "ptit_hun" || resumeRecord) return; const start = () => { if (!sfxEnabled || introPlayedRef.current) return; introPlayedRef.current = true; void unlockPtit1Audio(true); playPtit1Sfx("intro", true); }; try { if ((navigator as any)?.userActivation?.hasBeenActive) { start(); return; } } catch {} window.addEventListener("pointerdown", start, { once: true, capture: true } as any); return () => window.removeEventListener("pointerdown", start, true); }, [sfxEnabled]);
  React.useEffect(() => () => { cancelPtit1MatchEndSfx(); }, []);
  React.useEffect(() => { awena?.setRuntime?.({ route: "ptit_hun_play", sport: "darts", mode: "ptit_hun", phase: state.phase === "finished" ? "summary" : "play", inGame: state.phase !== "finished", screenLabel: ptit1Ui("P’TIT 1 · Partie","P’TIT 1 · Match"), playerName: activePlayer?.name, extra: { score: state.scores?.[activePlayer?.id], dbulls: state.statsByPlayer?.[activePlayer?.id]?.dbulls, shield: state.shieldActive?.[activePlayer?.id], cleanStreak: state.cleanStreak?.[activePlayer?.id], jackpots: state.jackpotTargets?.map((t: any) => t.label), rounds: config.rules.rounds } }); }, [awena, state.phase, state.activePlayerIndex, state.scores, state.shieldActive, state.cleanStreak, activePlayer?.id]);

  const commit = React.useCallback((next: PtitHunState, previous = state, forcedNotice?: string) => {
    const nextUndo = [...undo.slice(-39), clonePtitHunState(previous)];
    setUndo(nextUndo); setState(next); setCurrentThrow([]); setMultiplier(1); setSingleRing(null);
    const last: any = next.visits?.[next.visits.length - 1]; let msg = forcedNotice || "";
    let nextMoment: any = null;
    if (last) {
      const visitPlayer:any = next.players?.find((p:any)=>String(p.id)===String(last.playerId));
      const visitColor = colorById.get(String(last.playerId)) || ACCENT;
      setVisitCard({ key:`visit-${last.id}`, playerId:last.playerId, playerName:visitPlayer?.name || nameById(last.playerId), darts:last.darts || [], breakdown:ptit1VisitBreakdown(last, config.rules), specialLabel:last?.jackpotHit ? (fr ? "JACKPOT · VOLÉE ANNULÉE" : "JACKPOT · VISIT CANCELLED") : last?.petitOnePerfect ? (fr ? "P’TIT 1 PARFAIT · VOLÉE ANNULÉE" : "PERFECT P’TIT 1 · VISIT CANCELLED") : last?.tripleNul ? (fr ? "TRIPLE NUL · VOLÉE ANNULÉE" : "TRIPLE ZERO · VISIT CANCELLED") : last?.zeroAbsoluteNow ? (fr ? "ZÉRO ABSOLU" : "ABSOLUTE ZERO") : (fr ? "VOLÉE TERMINÉE" : "VISIT COMPLETE"), delta:Number(last.delta||0), after:Number(last.after||0), color:visitColor });
    }
    if (!msg && next.phase === "finished") { msg = next.winnerId ? (fr ? `🏆 ${nameById(next.winnerId)} remporte P’TIT 1 !` : `🏆 ${nameById(next.winnerId)} wins P’TIT 1!`) : (fr ? "🏁 P’TIT 1 terminé" : "🏁 P’TIT 1 finished"); playPtit1MatchEndSfx(sfxEnabled, Boolean(next.winnerId)); }
    else if (!msg && last?.zeroAbsoluteNow) { msg = fr ? `💎 ZÉRO ABSOLU ! ${config.rules.dbullsForZero}e DBULL : score remis à 0` : `💎 ABSOLUTE ZERO! DBULL #${config.rules.dbullsForZero}: score reset to 0`; nextMoment = { key: `zero-${last.id}`, playerId: last.playerId, icon: "💎", kicker: fr ? "EXPLOIT DU P’TIT HUN" : "P’TIT HUN FEAT", title: fr ? "ZÉRO ABSOLU" : "ABSOLUTE ZERO", detail: fr ? `${config.rules.dbullsForZero}e DBULL cumulé · score total remis à 0` : `Cumulative DBULL #${config.rules.dbullsForZero} · total score reset to 0`, tone: "success", durationMs: 2600 };  }
    else if (!msg && last?.shieldUnlockedNow) { msg = fr ? "🛡 BOUCLIER DU HUN débloqué jusqu’à la fin" : "🛡 HUN SHIELD unlocked until the end"; nextMoment = { key: `shield-${last.id}`, playerId: last.playerId, icon: "🛡️", kicker: fr ? `${config.rules.cleanVisitsForShield} TRIPLE NUL D’AFFILÉE` : `${config.rules.cleanVisitsForShield} CONSECUTIVE TRIPLE ZERO VISITS`, title: fr ? "BOUCLIER DU HUN" : "HUN SHIELD", detail: fr ? `Les prochaines pénalités sont divisées par ${config.rules.shieldDivider}` : `Future penalties are divided by ${config.rules.shieldDivider}`, tone: "success", durationMs: 2300 }; playPtit1Sfx("shield", sfxEnabled); }
    else if (!msg && last?.jackpotHit) { msg = fr ? `✦ JACKPOT ${last?.jackpotTargets?.map((t: any) => t.label).join("/") || ""} ! Volée à 0` : `✦ JACKPOT ${last?.jackpotTargets?.map((t: any) => t.label).join("/") || ""}! Visit cancelled to 0`; nextMoment = { key: `jackpot-${last.id}`, playerId: last.playerId, icon: "✦", kicker: fr ? "ZONE SPÉCIALE TOUCHÉE" : "SPECIAL ZONE HIT", title: fr ? "JACKPOT · VOLÉE 0" : "JACKPOT · ZERO VISIT", detail: fr ? `${last?.jackpotTargets?.map((t: any) => t.label).join(" / ") || "Double / Triple"} neutralise toute la volée` : `${last?.jackpotTargets?.map((t: any) => t.label).join(" / ") || "Double / Triple"} cancels the whole visit`, tone: "success", durationMs: 2300 };  }
    else if (!msg && last?.petitOnePerfect) { msg = fr ? "🎯 P’TIT 1 PARFAIT ! Trois petits 1 : volée à 0" : "🎯 PERFECT P’TIT 1! Three small 1s: zero visit"; nextMoment = { key: `ptit1-${last.id}`, playerId: last.playerId, icon: "1️⃣", kicker: fr ? "SIGNATURE DU MODE" : "MODE SIGNATURE", title: fr ? "P’TIT 1 PARFAIT" : "PERFECT P’TIT 1", detail: fr ? "Petit 1 · Petit 1 · Petit 1 · volée à 0" : "Small 1 · Small 1 · Small 1 · zero visit", tone: "success", durationMs: 2450 }; }
    else if (!msg && last?.tripleNul) { msg = fr ? `🎯 TRIPLE NUL ! Trois petits ${last?.tripleNulNumber || ""} : volée à 0` : `🎯 TRIPLE ZERO! Three small ${last?.tripleNulNumber || ""}: zero visit`; nextMoment = { key: `triple-nul-${last.id}`, playerId: last.playerId, icon: "🎯", kicker: fr ? "PRÉCISION PURE" : "PURE PRECISION", title: fr ? "TRIPLE NUL" : "TRIPLE ZERO", detail: fr ? `3 petits ${last?.tripleNulNumber || "?"} identiques · volée à 0` : `3 identical small ${last?.tripleNulNumber || "?"} · zero visit`, tone: "success", durationMs: 2200 }; }
    else if (!msg && last?.zeroPenaltyFloor) { msg = fr ? `⚠️ SCORE À 0 : pénalité relancée depuis ${config.rules.startScore}` : `⚠️ SCORE AT 0: penalty restarts from ${config.rules.startScore}`; nextMoment = { key: `zero-floor-${last.id}`, playerId: last.playerId, icon: "⚠️", kicker: fr ? "0 NE PROTÈGE PAS" : "0 DOES NOT PROTECT YOU", title: fr ? "ZONE DANGEREUSE" : "DANGER ZONE", detail: fr ? `À 0, le MISS multiplicatif repart du capital ${config.rules.startScore}` : `At 0, a multiplicative MISS restarts from the ${config.rules.startScore} starting capital`, tone: "danger", durationMs: 1900 }; }
    else if (!msg) msg = (last?.events || []).join(" · ");
    if (nextMoment) setMoment(nextMoment);
    setNotice(msg); persist(next, nextUndo);
  }, [state, undo, nameById, colorById, persist, sfxEnabled, config.rules.dbullsForZero, config.rules.shieldDivider, config.rules.startScore, fr]);

  const validate = () => { if (currentThrow.length !== 3 || state.phase === "finished" || activeIsBot) return; commit(playPtitHunVisit(state, currentThrow.map(uiToGameDart))); };
  const doUndo = () => setUndo((u) => { if (!u.length) return u; const prev = u[u.length - 1]; const remaining = u.slice(0, -1); setState(clonePtitHunState(prev)); setCurrentThrow([]); setMultiplier(1); setSingleRing(null); setMoment(null); setNotice(fr ? "Dernière volée annulée" : "Last visit undone"); finishedRef.current = false; void saveInProgress(prev, [], 1, singleRing, remaining); return remaining; });
  const setThrowWithSfx = React.useCallback((update: any) => setCurrentThrow((prev: UIDart[]) => {
    const next = (typeof update === "function" ? update(prev) : update) || prev;
    const out = Array.isArray(next) ? next.slice(0, 3) : prev;
    if (out.length > prev.length) {
      out.slice(prev.length).forEach((d: any, i: number) => window.setTimeout(() => {
        if (activePlayer) {
          const beforeDraft = out.slice(0, prev.length + i);
          const meta = ptit1HitMeta(state, String(activePlayer.id), beforeDraft, d);
          setHitCard({ ...meta, key:`hit-${Date.now()}-${prev.length+i}` });
          playPtit1HitSfx(meta, sfxEnabled);
        }
      }, i * 120));
    }
    return out;
  }), [sfxEnabled, state, activePlayer?.id]);
  const lastThrowLengthRef = React.useRef(currentThrow.length);
  React.useEffect(() => { const prevLen = lastThrowLengthRef.current; const nextLen = currentThrow.length; if (nextLen > prevLen) { setMultiplier(1); setSingleRing(null); } lastThrowLengthRef.current = nextLen; }, [currentThrow.length]);
  React.useEffect(() => { if (!activeIsBot || state.phase === "finished" || botBusy.current) return; botBusy.current = true; const t = window.setTimeout(() => { try { const darts = pickPtitHunBotDarts(state, config.botLevel); const pid = String(activePlayer?.id || ""); const span = playPtit1DartSequence(darts, sfxEnabled, (dart:any, _index:number, before:any[]) => ptit1HitMeta(state, pid, before.map((x:any)=>gameToUiDartForPtit1(x)), gameToUiDartForPtit1(dart))); window.setTimeout(() => { try { commit(playPtitHunVisit(state, darts)); } finally { botBusy.current = false; } }, span + 120); } catch { botBusy.current = false; } }, 620); return () => window.clearTimeout(t); }, [state, activeIsBot, activePlayer?.id, sfxEnabled]);

  function replay() { cancelPtit1MatchEndSfx(); matchIdRef.current = `ptit1-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; finishedRef.current = false; setUndo([]); setNotice(""); setMoment(null); setHitCard(null); setVisitCard(null); setCurrentThrow([]); setMultiplier(1); setSingleRing(null); const next = createPtitHunState(players, config); setState(next); initialCheckpointRef.current = true; void saveInProgress(next, [], 1, singleRing, []); if (sfxEnabled) playPtit1Sfx("intro", true); }

  const activeStats: any = state.statsByPlayer?.[activePlayer?.id] || {};
  const score = Number(state.scores?.[activePlayer?.id] || 0);
  const liveProjection = React.useMemo(() => activePlayer ? ptit1DraftProjection(state, String(activePlayer.id), currentThrow) : { before: score, score, delta: 0, dbulls: 0, jackpot: false }, [state, activePlayer?.id, currentThrow, score]);
  const round = Math.min(config.rules.rounds, Number(activeStats.visits || 0) + 1);
  const shield = Boolean(state.shieldActive?.[activePlayer?.id]);
  const clean = Number(state.cleanStreak?.[activePlayer?.id] || 0);
  const preview = React.useMemo(() => { if (currentThrow.length !== 3 || !activePlayer) return null; const next = playPtitHunVisit(state, currentThrow.map(uiToGameDart)); return next.visits?.[next.visits.length - 1] || null; }, [currentThrow, state, activePlayer?.id]);
  const zeroProgress = config.rules.dbullEnabled && config.rules.zeroAbsoluteEnabled ? `${activeStats.dbulls || 0}/${config.rules.dbullsForZero}` : "OFF";
  const zeroHint = config.rules.dbullEnabled && config.rules.zeroAbsoluteEnabled ? `${Math.max(0, Number(config.rules.dbullsForZero || 0) - Number(activeStats.dbulls || 0))} DBULL ${fr ? "avant le Zéro absolu" : "before Absolute Zero"}` : (fr ? "Bonus désactivé" : "Bonus disabled");
  const shieldProgress = config.rules.shieldEnabled ? (shield ? (fr ? "ACTIF" : "ACTIVE") : `${clean}/${config.rules.cleanVisitsForShield}`) : "OFF";
  const shieldHint = config.rules.shieldEnabled ? (shield ? (fr ? `Pénalités divisées par ${config.rules.shieldDivider}` : `Penalties divided by ${config.rules.shieldDivider}`) : `${Math.max(0, Number(config.rules.cleanVisitsForShield || 0) - clean)} ${fr ? "TRIPLE NUL avant activation" : "TRIPLE ZERO visits before activation"}`) : (fr ? "Bonus désactivé" : "Bonus disabled");
  const jackpotLabel = config.rules.jackpotEnabled && state.jackpotTargets?.length ? state.jackpotTargets.map((t:any) => t.label).join(" / ") : "OFF";
  const segmentZoneSelected = multiplier === 2 || multiplier === 3 || singleRing === "inner_single" || singleRing === "outer_single";
  const addDbull = React.useCallback(() => { if (currentThrow.length >= 3) return; setThrowWithSfx((prev: UIDart[]) => [...prev, { v: 25, mult: 2 }].slice(0, 3)); }, [currentThrow.length, setThrowWithSfx]);
  const addBull25 = React.useCallback(() => { if (currentThrow.length >= 3) return; setThrowWithSfx((prev: UIDart[]) => [...prev, { v: 25, mult: 1 }].slice(0, 3)); }, [currentThrow.length, setThrowWithSfx]);
  const addSpecialZone = React.useCallback((zone:any) => { if (currentThrow.length >= 3) return; const label=`ptit_special|${String(zone?.code||"zone")}|${String(zone?.label||"ZONE")}`; setThrowWithSfx((prev: UIDart[]) => [...prev, { v: 0, mult: 1, label } as any].slice(0,3)); setSpecialOpen(false); }, [currentThrow.length, setThrowWithSfx]);
  const appendKeypadDart = React.useCallback((d: UIDart) => { if (currentThrow.length >= 3) return; setThrowWithSfx((prev: UIDart[]) => [...prev, ringDecorator(d)].slice(0,3)); }, [currentThrow.length, setThrowWithSfx, singleRing]);
  const ringDecorator = (d: UIDart) => { if ((d as any)?.label) return d; if (Number(d?.v) >= 1 && Number(d?.v) <= 20 && Number(d?.mult) === 1 && singleRing) return { ...d, label: singleRing }; return d; };
  const firstVisitGuide = firstVisitGuideEnabled && !activeIsBot && state.turnIndex === 0 && currentThrow.length === 0;
  const coach = firstVisitGuide
    ? (fr
      ? `1 · Choisis PETIT pour viser la zone simple intérieure. 2 · Le petit 1 vaut +1 ; le gros 1 vaut +${config.rules.outerSingleFactor}. 3 · Double : valeur D ×${config.rules.doubleFactor}, Triple : valeur T ×${config.rules.tripleFactor}, Bull25 : 25 ×${config.rules.bull25Factor}. 4 · ${config.rules.jackpotEnabled ? `Jackpot ${state.jackpotTargets.map((t: any) => t.label).join("/")} = volée 0.` : config.rules.dbullEnabled ? `1er DBULL ÷${config.rules.dbullDivider}, 2e ÷${Math.pow(Number(config.rules.dbullDivider || 2), 2)}, puis Zéro Absolu au ${config.rules.dbullsForZero}e.` : "Reste dans les petits simples."}`
      : `1 · Choose SMALL to target the inner single zone. 2 · Small 1 is +1; big 1 is +${config.rules.outerSingleFactor}. 3 · Double: D value ×${config.rules.doubleFactor}, Triple: T value ×${config.rules.tripleFactor}, Bull25: 25 ×${config.rules.bull25Factor}. 4 · ${config.rules.jackpotEnabled ? `Jackpot ${state.jackpotTargets.map((t: any) => t.label).join("/")} = zero visit.` : config.rules.dbullEnabled ? `1st DBULL ÷${config.rules.dbullDivider}, 2nd ÷${Math.pow(Number(config.rules.dbullDivider || 2), 2)}, then Absolute Zero on DBULL #${config.rules.dbullsForZero}.` : "Stay in the small singles."}`)
    : coachEnabled && !activeIsBot ? coachText(state, activePlayer) : "";
  const ranked = rankPtitHunPlayers(state);
  const rankingRows = ranked.map((r: any) => { const p: any = state.players.find((x: any) => String(x.id) === String(r.id)); const st: any = state.statsByPlayer?.[r.id] || {}; const color = colorById.get(String(r.id)) || ACCENT; return { id: r.id, name: p?.name || "Joueur", profile: profileById.get(String(r.id)) || p, color, value: r.score, suffix: " pts", subtitle: `${st.jackpotVisits || 0} Jackpot · ${st.tripleNuls || 0} Triple Nul · ${st.dbulls || 0}/${config.rules.dbullsForZero} DBULL · ${state.shieldActive?.[r.id] ? (fr ? "🛡 actif" : "🛡 active") : `${state.cleanStreak?.[r.id] || 0}/${config.rules.cleanVisitsForShield} ${fr ? "bouclier" : "shield"}`}`, score: r.score, order: r.rank }; });
  const playersRows = ranked.map((r: any) => { const p: any = state.players.find((x: any) => String(x.id) === String(r.id)); const st: any = state.statsByPlayer?.[r.id] || {}; const color = colorById.get(String(r.id)) || ACCENT; const lastVisit=[...(state.visits||[])].reverse().find((v:any)=>String(v.playerId)===String(r.id)) || null; return { id: r.id, name: p?.name || "Joueur", profile: profileById.get(String(r.id)) || p, color, active: String(r.id) === String(activePlayer?.id), status: state.shieldActive?.[r.id] ? (fr ? "🛡 BOUCLIER ACTIF" : "🛡 SHIELD ACTIVE") : config.rules.shieldEnabled ? `${state.cleanStreak?.[r.id] || 0}/${config.rules.cleanVisitsForShield} ${fr ? "TRIPLE NUL" : "TRIPLE ZERO"}` : (fr ? "BOUCLIER OFF" : "SHIELD OFF"), score:r.score, lastVisit, lastBreakdown:ptit1VisitBreakdown(lastVisit, config.rules), progress: Number(st.visits || 0), progressMax: config.rules.rounds, metrics: [{ label: "SCORE", value: r.score }, { label: "P’TIT 1", value: st.petitOneHits || 0 }, { label: "DBULL", value: st.dbulls || 0 }, { label: fr ? "VOLÉES 0" : "ZERO VISITS", value: st.zeroVisits || 0 }] }; });
  const statsItems = [
    { label: "SCORE", value: score, color: ACCENT }, { label: fr ? "P’TIT 1 TOUCHÉS" : "P’TIT 1 HITS", value: activeStats.petitOneHits || 0, color: ACCENT }, { label: fr ? "P’TIT 1 PARFAITS" : "PERFECT P’TIT 1", value: activeStats.petitOneTriples || 0, color: ACCENT },
    { label: fr ? "PETITS SIMPLES" : "SMALL SINGLES", value: activeStats.innerSingles || 0, color: GREEN }, { label: fr ? "GROS SIMPLES" : "BIG SINGLES", value: activeStats.outerSingles || 0, color: "#ffb86b" }, { label: fr ? "VOLÉES À 0" : "ZERO VISITS", value: activeStats.zeroVisits || 0, color: GREEN },
    { label: fr ? "TRIPLE NUL" : "TRIPLE ZERO", value: activeStats.tripleNuls || 0, color: ACCENT }, { label: fr ? "QUALIF. BOUCLIER" : "SHIELD QUALIFIERS", value: activeStats.shieldQualifyingVisits || activeStats.cleanVisits || 0 }, { label: fr ? "SÉRIE TRIPLE NUL" : "TRIPLE ZERO STREAK", value: shield ? (fr ? "🛡 ACTIF" : "🛡 ACTIVE") : config.rules.shieldEnabled ? `${clean}/${config.rules.cleanVisitsForShield}` : "OFF", color: shield ? GREEN : ACCENT },
    { label: "DBULL", value: `${activeStats.dbulls || 0}/${config.rules.dbullsForZero}`, color: BLUE }, { label: fr ? "DBULL · PTS RETIRÉS" : "DBULL · PTS REMOVED", value: activeStats.dbullSaved || 0, color: BLUE }, { label: "JACKPOTS", value: activeStats.jackpotVisits || 0, color: "#ffd84d" }, { label: fr ? "JACKPOT · PTS ANNULÉS" : "JACKPOT · PTS CANCELLED", value: activeStats.jackpotSaved || 0, color: "#ffd84d" }, { label: fr ? "TRIPLE NUL · PTS ANNULÉS" : "TRIPLE ZERO · PTS CANCELLED", value: activeStats.tripleNulSaved || 0, color: ACCENT }, { label: fr ? "ZÉRO ABSOLU" : "ABSOLUTE ZERO", value: activeStats.zeroAbsolute || 0 }, { label: fr ? "BOUCLIER · PTS SAUVÉS" : "SHIELD · PTS SAVED", value: activeStats.shieldSaved || 0, color: GREEN },
    { label: fr ? "DÉGÂTS MISS" : "MISS DAMAGE", value: activeStats.missDamage || 0, color: RED }, { label: "MIN / MAX", value: `${activeStats.lowestScore ?? score} / ${activeStats.highestScore ?? score}`, color: ACCENT }, { label: "DOUBLES", value: activeStats.doubles || 0, color: RED }, { label: "TRIPLES", value: activeStats.triples || 0, color: RED }, { label: "BULL25", value: activeStats.bulls25 || 0, color: RED }, { label: "MISS", value: activeStats.misses || 0, color: RED }, { label: fr ? "FLÉCHETTES" : "DARTS", value: activeStats.darts || 0 },
  ];
  const awards = React.useMemo(() => { const rows = rankingRows.map((r: any) => ({ ...r, st: state.statsByPlayer?.[r.id] || {} })); const nul = bestBy(rows, (r: any) => -Number(r.score || 0)); const ptit1 = bestBy(rows, (r: any) => Number(r.st.petitOneHits || 0) * 10 + Number(r.st.petitOneTriples || 0) * 100); const zero = bestBy(rows, (r: any) => Number(r.st.zeroVisits || 0) * 100 + Number(r.st.tripleNuls || 0)); const center = bestBy(rows, (r: any) => Number(r.st.dbulls || 0)); return [{ icon: "👑", label: fr ? "ROI DES NULS" : "LOW-SCORE KING", name: nul?.name || "—", value: `${nul?.score ?? 0} pts`, color: nul?.color }, { icon: "1️⃣", label: fr ? "MAÎTRE DU P’TIT 1" : "P’TIT 1 MASTER", name: ptit1?.name || "—", value: `${ptit1?.st?.petitOneHits || 0} ${fr ? "touches" : "hits"} · ${ptit1?.st?.petitOneTriples || 0} ${fr ? "parfait" : "perfect"}`, color: ptit1?.color }, { icon: "0️⃣", label: fr ? "VOLÉES ZÉRO" : "ZERO VISITS", name: zero?.name || "—", value: `${zero?.st?.zeroVisits || 0} ${fr ? "volée(s)" : "visit(s)"}`, color: zero?.color }, { icon: "💎", label: fr ? "DOMPTEUR DU CENTRE" : "CENTRE TAMER", name: center?.name || "—", value: `${center?.st?.dbulls || 0} DBULL`, color: center?.color }]; }, [rankingRows, state.statsByPlayer]);
  const totalDarts = Object.values(state.statsByPlayer || {}).reduce((a: number, r: any) => a + Number(r?.darts || 0), 0), durationMs = Math.max(0, Number((state.finishedAt || Date.now())) - Number(state.startedAt || Date.now()));

  if (state.phase === "finished") {
    const rec = buildRecord(state, "finished", [], 1, singleRing);
    return <div className="party-mode" style={{ ["--mode-accent" as any]: ACCENT }} data-mss-native-play-layout="1">
      <PremiumMomentOverlay moment={moment} accent={moment?.playerId ? (colorById.get(String(moment.playerId)) || ACCENT) : ACCENT} profile={moment?.playerId ? profileById.get(String(moment.playerId)) : activeProfile} playerName={moment?.playerId ? nameById(moment.playerId) : activePlayer?.name} />
      <PageHeader tickerSrc={tickerPtitHun} tickerAlt="P’TIT 1" tickerHeight={68} tickerBottomGap={8} tickerFit="cover" left={<div style={{ marginLeft: 7 }}><BackDot onClick={() => go?.("ptit_hun_config")} color={ACCENT} glow={`${ACCENT}88`} /></div>} right={awenaEnabled ? <div style={{ marginRight: 7 }}><PremiumAwenaButton awena={awena} route="ptit_hun_play" mode="ptit_hun" screenLabel="P’TIT 1 · Résultat" accent={ACCENT} /></div> : null} />
      <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "auto" }}>
        <PremiumEndPanel title="P’TIT 1" accent={ACCENT} winnerId={state.winnerId} rankingRows={rankingRows} durationMs={durationMs} totalDarts={totalDarts} awards={awards} onReplay={replay} onStats={() => go?.("darts_mode_summary", { rec, mode: "ptit_hun" })} onHistory={() => go?.("statsHub", { tab: "history", mode: "active", initialStatsSubTab: "history", focusMatchId: matchIdRef.current })} onConfig={() => go?.("ptit_hun_config")} onGames={() => go?.("games", { gamesView: "all" })} />
        <Ptit1FinalDashboard state={state} rankingRows={rankingRows} colorById={colorById} nameById={nameById} />
      </div>
    </div>;
  }

  return <div className="ptit1-play" style={{ ["--ptit-accent" as any]: activeColor }} data-mss-native-play-layout="1">
    <style>{`
      .ptit1-play{position:fixed;inset:0;width:100vw;height:100dvh;max-height:100dvh;overflow:hidden;display:flex;flex-direction:column;gap:4px;padding:4px;background:radial-gradient(circle at 12% 10%,color-mix(in srgb,var(--ptit-accent) 9%,transparent),transparent 28%),linear-gradient(180deg,#090b12,#04060a);color:#fff;overscroll-behavior:none;box-sizing:border-box;touch-action:manipulation}
      .ptit1-play *{box-sizing:border-box}
      .ptit1-head{position:relative;flex:0 0 clamp(50px,8.5vh,64px);min-height:0;overflow:hidden;border-radius:15px;border:1px solid rgba(255,255,255,.08);background:#080b11;display:flex;align-items:center;justify-content:center}
      .ptit1-head>img{width:100%;height:100%;object-fit:cover;object-position:center;display:block}
      .ptit1-head:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(4,5,8,.92),transparent 18%,transparent 82%,rgba(4,5,8,.92));pointer-events:none}
      .ptit1-head__controls{position:absolute;z-index:2;inset:0;display:flex;align-items:center;justify-content:space-between;padding:0 7px;pointer-events:none}
      .ptit1-head__controls>div{display:flex;align-items:center;gap:6px;pointer-events:auto}
.ptit1-sound-toggle{width:36px;height:36px;border-radius:999px;border:1px solid color-mix(in srgb,var(--ptit-accent) 55%,rgba(255,255,255,.12));background:rgba(5,7,11,.78);color:var(--ptit-accent);display:grid;place-items:center;font-size:16px;box-shadow:0 0 14px color-mix(in srgb,var(--ptit-accent) 18%,transparent);cursor:pointer}.ptit1-sound-toggle.is-off{color:#7f8798;border-color:rgba(255,255,255,.12);box-shadow:none}
      .ptit1-stage{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:5px;overflow:hidden}
      .ptit1-left{flex:0 0 auto;display:flex;flex-direction:column;gap:5px;min-height:0}
      .ptit1-active{position:relative;flex:0 0 clamp(118px,16.5vh,140px);min-height:0;overflow:hidden;border-radius:17px;border:1px solid color-mix(in srgb,var(--ptit-accent) 50%,rgba(255,255,255,.08));background:linear-gradient(135deg,rgba(18,21,31,.98),rgba(6,8,13,.98));box-shadow:0 0 24px color-mix(in srgb,var(--ptit-accent) 13%,transparent)}
      .ptit1-active__grid{position:relative;height:100%;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 126px;gap:6px;padding:7px}
      .ptit1-active__mission{position:relative;min-width:0;min-height:0;overflow:hidden;border-radius:14px;background:#080b12;box-shadow:0 0 0 1px color-mix(in srgb,var(--ptit-accent) 30%,transparent) inset}
      .ptit1-identity-watermark{position:absolute;left:-5%;top:-18%;width:48%;height:136%;object-fit:contain;opacity:.15;pointer-events:none;filter:saturate(.85)}
      .ptit1-identity-watermark.is-team{left:-2%;top:-12%;width:44%;height:124%}
      .ptit1-identity-avatar-watermark{position:absolute;left:-20px;top:50%;transform:translateY(-50%) scale(1.54);opacity:.20;pointer-events:none;filter:saturate(.9) blur(.12px)}
      .ptit1-identity-gradient{position:absolute;inset:0;background:linear-gradient(90deg,color-mix(in srgb,var(--ptit-accent) 11%,transparent),rgba(0,0,0,.10) 38%,rgba(0,0,0,.48));pointer-events:none}
      .ptit1-identity-content{position:relative;z-index:2;height:100%;display:grid;align-items:center;justify-items:center;padding:7px 9px}
      .ptit1-identity-content.is-solo{grid-template-columns:1fr;padding-left:72px}
      .ptit1-identity-content.is-team{grid-template-columns:44px minmax(0,1fr);gap:7px;padding-left:8px}
      .ptit1-identity-avatar{display:grid;place-items:center}.ptit1-identity-avatar.is-overlay{align-self:center;justify-self:center}
      .ptit1-score-center{min-width:0;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
      .ptit1-team-name{max-width:100%;color:var(--ptit-accent);font-size:6.8px;font-weight:1000;letter-spacing:.7px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ptit1-player-name{max-width:100%;color:#fff;font-size:9px;font-weight:1100;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.5px}
      .ptit1-score-value{margin-top:2px;color:var(--ptit-accent);font-size:clamp(34px,9.5vw,50px);line-height:.86;font-weight:1100;text-shadow:0 0 22px color-mix(in srgb,var(--ptit-accent) 34%,transparent)}
      .ptit1-turn-row{margin-top:6px;display:grid;grid-template-columns:auto auto;gap:3px;justify-content:center}.ptit1-turn-row span,.ptit1-turn-row b{height:20px;min-width:42px;border-radius:8px;border:1px solid color-mix(in srgb,var(--ptit-accent) 38%,rgba(255,255,255,.08));background:rgba(0,0,0,.32);display:grid;place-items:center;font-size:6.8px;font-weight:1100}.ptit1-turn-row span{color:#8f9ab0;letter-spacing:.6px}.ptit1-turn-row b{color:#fff;font-size:9px}
      .ptit1-player-card{position:relative;overflow:hidden;border-radius:14px;border:1px solid color-mix(in srgb,var(--ptit-accent) 45%,rgba(255,255,255,.08));background:linear-gradient(180deg,rgba(10,13,20,.78),rgba(3,5,9,.92));display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:6px}
      .ptit1-player-card:before{content:"";position:absolute;inset:0;background-image:linear-gradient(180deg,rgba(0,0,0,.18),rgba(0,0,0,.72)),url(${tickerPtitHun});background-size:cover;background-position:center;opacity:.36}
      .ptit1-player-card>*{position:relative;z-index:1}
      .ptit1-player-card__name{width:100%;text-align:center;color:var(--ptit-accent);font-size:9px;font-weight:1100;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase}
      .ptit1-player-card__meta{width:100%;display:grid;grid-template-columns:repeat(3,1fr);gap:3px}
      .ptit1-radar-stack{width:126px;min-width:126px;height:100%;min-height:0;display:grid;grid-template-rows:12px minmax(0,1fr) 24px;gap:3px;align-items:stretch;overflow:hidden}.ptit1-radar-label{text-align:center;color:#dce7ff;font-size:7.2px;font-weight:1100;letter-spacing:.9px;line-height:12px}.ptit1-radar-button{width:100%;height:100%;min-height:0;max-height:100%;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:radial-gradient(circle,rgba(120,243,212,.08),rgba(0,0,0,.28));padding:2px;overflow:hidden;cursor:pointer;display:grid;place-items:center}.ptit1-radar-button img{width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;display:block;filter:drop-shadow(0 5px 12px rgba(0,0,0,.5));pointer-events:none}.ptit1-jackpot-row{display:grid;grid-template-columns:1fr 1fr;gap:3px}.ptit1-jackpot-row span,.ptit1-jackpot-row b{min-width:0;border-radius:8px;border:1px solid rgba(255,216,77,.28);background:rgba(255,216,77,.07);display:grid;place-items:center;height:22px;font-size:7px;font-weight:1100;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ptit1-jackpot-row span{color:#ffd84d;letter-spacing:.5px}.ptit1-jackpot-row b{color:#fff;font-size:9px}.ptit1-bonus-strip{flex:0 0 52px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.ptit1-kpis{flex:0 0 44px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;padding:5px;border-radius:13px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(16,19,28,.96),rgba(5,7,12,.98))}
      .ptit1-tools{flex:0 0 48px;display:grid;grid-template-columns:42px minmax(0,1fr) 42px 42px;gap:5px}
      .ptit1-players{position:relative;overflow:hidden;border-radius:13px;border:1px solid rgba(255,255,255,.08);background:#080b11;padding:4px 8px;cursor:pointer;color:#fff}
      .ptit1-players:before{content:"";position:absolute;inset:0;background-image:linear-gradient(90deg,rgba(0,0,0,.82),rgba(0,0,0,.34),rgba(0,0,0,.82)),url(${tickerPtitHun});background-size:cover;background-position:center;opacity:.64}
      .ptit1-players>div{position:relative;height:100%;display:flex;align-items:center;justify-content:center;gap:0}
      .ptit1-tool{height:48px;border-radius:13px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(180deg,rgba(18,21,31,.96),rgba(6,8,14,.98));color:#fff;font-size:16px;display:grid;place-items:center;cursor:pointer}
      .ptit1-visit{flex:0 0 38px;display:grid;place-items:center;padding:4px 7px;border-radius:12px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(16,19,28,.96),rgba(5,7,12,.98))}
      .ptit1-input{flex:1 1 auto;min-height:0;overflow:hidden;display:flex}
      .ptit1-scorehub{flex:1 1 auto;min-height:0;width:100%;overflow:hidden;border-radius:16px;border:1px solid color-mix(in srgb,var(--ptit-accent) 30%,rgba(255,255,255,.08));background:linear-gradient(180deg,rgba(14,17,25,.96),rgba(4,6,10,.98));padding:6px}
      .ptit1-scorehub>[data-mss-score-input-hub="1"],.ptit1-input [data-mss-score-input-hub="1"]{height:100%;min-height:0;max-width:100%;overflow:hidden}
      .ptit1-hit-card{position:fixed;z-index:92;left:50%;top:clamp(88px,15vh,145px);transform:translateX(-50%);width:min(330px,88vw);min-height:64px;border-radius:17px;border:1px solid color-mix(in srgb,var(--hit-color) 72%,rgba(255,255,255,.12));background:linear-gradient(135deg,rgba(7,9,14,.97),rgba(16,19,28,.97));box-shadow:0 18px 48px rgba(0,0,0,.55),0 0 28px color-mix(in srgb,var(--hit-color) 28%,transparent);display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:9px;align-items:center;padding:8px 10px;pointer-events:none;animation:ptit1CardIn .16s ease-out}
      .ptit1-hit-card__icon{width:42px;height:42px;border-radius:13px;background:color-mix(in srgb,var(--hit-color) 18%,rgba(0,0,0,.65));border:1px solid color-mix(in srgb,var(--hit-color) 55%,transparent);display:grid;place-items:center;color:var(--hit-color);font-size:20px;font-weight:1100}.ptit1-hit-card small{display:block;color:#8994a9;font-size:6.5px;font-weight:1000;letter-spacing:.7px}.ptit1-hit-card b{display:block;margin-top:1px;color:var(--hit-color);font-size:13px;font-weight:1100}.ptit1-hit-card span{display:block;margin-top:2px;color:#e8edf7;font-size:8px}.ptit1-hit-card>strong{color:var(--hit-color);font-size:22px;font-weight:1100}
      .ptit1-visit-card{position:fixed;z-index:91;left:50%;top:50%;transform:translate(-50%,-50%);width:min(360px,90vw);border-radius:19px;border:1px solid color-mix(in srgb,var(--ptit-accent) 58%,rgba(255,255,255,.10));background:linear-gradient(135deg,rgba(8,10,16,.98),rgba(18,21,30,.98));box-shadow:0 24px 70px rgba(0,0,0,.68),0 0 34px color-mix(in srgb,var(--ptit-accent) 20%,transparent);display:grid;grid-template-columns:58px minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px 12px;pointer-events:none;animation:ptit1VisitPop .22s cubic-bezier(.2,.9,.25,1.2)}
      .ptit1-visit-card__copy small,.ptit1-visit-card__score small{display:block;color:#8f98aa;font-size:6.7px;font-weight:1000;letter-spacing:.65px}.ptit1-visit-card__copy>b{display:block;margin-top:2px;color:#fff;font-size:12px;text-transform:uppercase}.ptit1-visit-card__darts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px;margin-top:5px}.ptit1-visit-card__darts span{height:28px;border-radius:7px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);display:grid;grid-template-rows:auto auto;place-items:center;align-content:center;font-size:7px;color:#dfe7f4;line-height:1}.ptit1-visit-card__darts span i{font-style:normal;margin-top:2px;font-size:6px;color:var(--ptit-accent);font-weight:1000}.ptit1-visit-card__score{text-align:right}.ptit1-visit-card__score b{display:block;color:var(--ptit-accent);font-size:23px;line-height:1;font-weight:1100}.ptit1-visit-card__score span{display:block;margin-top:4px;color:#fff;font-size:8px;font-weight:1000}
      @keyframes ptit1CardIn{from{opacity:0;transform:translate(-50%,-8px) scale(.96)}to{opacity:1;transform:translate(-50%,0) scale(1)}}@keyframes ptit1VisitPop{from{opacity:0;transform:translate(-50%,-50%) scale(.86)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
      @media (orientation:landscape){
        .ptit1-play{gap:5px;padding:5px}
        .ptit1-head{flex-basis:46px;border-radius:12px}
        .ptit1-head>img{width:auto;height:100%;max-width:none;object-fit:contain;object-position:center center;margin:0 auto}
        .ptit1-stage{display:grid;grid-template-columns:minmax(300px,38%) minmax(0,1fr);gap:6px}
        .ptit1-left{height:100%;display:grid;grid-template-rows:minmax(108px,1.45fr) 50px 42px 46px 36px;gap:5px;overflow:hidden}
        .ptit1-active{height:100%;min-height:0;flex:auto}
        .ptit1-active__grid{grid-template-columns:minmax(0,1fr) 118px;padding:6px}.ptit1-radar-stack{width:118px;min-width:118px}
        .ptit1-active__mission{gap:7px}
        .ptit1-active__copy b{font-size:29px;margin-top:3px}.ptit1-active__copy span{margin-top:3px}
        .ptit1-kpis,.ptit1-tools,.ptit1-visit{height:100%;min-height:0;flex:auto}
        .ptit1-tools{grid-template-columns:38px minmax(0,1fr) 38px 38px}
        .ptit1-tool{height:100%}
        .ptit1-input{height:100%}
      }
      @media (orientation:landscape) and (max-width:980px){
        .ptit1-play{gap:4px;padding:4px}
        .ptit1-head{flex-basis:42px}
        .ptit1-stage{grid-template-columns:minmax(232px,41%) minmax(0,1fr);gap:5px}
        .ptit1-left{grid-template-rows:minmax(96px,1.35fr) 46px 38px 42px 32px;gap:4px}
        .ptit1-active__grid{grid-template-columns:minmax(0,1fr) 102px;padding:5px}
        .ptit1-radar-stack{width:102px;min-width:102px;grid-template-rows:10px minmax(0,1fr) 22px}
        .ptit1-radar-label{font-size:6.4px;line-height:10px}
        .ptit1-radar-button{border-radius:11px;padding:2px}
        .ptit1-jackpot-row span,.ptit1-jackpot-row b{height:20px;font-size:6.3px}
        .ptit1-bonus-strip{flex-basis:46px;gap:4px}
        .ptit1-kpis{padding:4px;gap:3px}
        .ptit1-tools{grid-template-columns:34px minmax(0,1fr) 34px 34px;gap:4px}
        .ptit1-tool{font-size:14px;border-radius:11px}
        .ptit1-players{padding:3px 6px}
        .ptit1-scorehub{padding:5px;border-radius:14px}
        .ptit1-identity-content.is-solo{padding-left:58px}
        .ptit1-identity-content.is-team{grid-template-columns:36px minmax(0,1fr);gap:6px;padding-left:6px}
        .ptit1-player-name{font-size:8px}
        .ptit1-score-value{font-size:clamp(26px,6.8vw,38px)}
        .ptit1-turn-row{margin-top:4px}
        .ptit1-turn-row span,.ptit1-turn-row b{height:18px;min-width:38px;font-size:6.2px}
        .ptit1-sound-toggle{width:32px;height:32px;font-size:14px}
      }
      @media (max-height:700px) and (orientation:portrait){
        .ptit1-play{gap:3px;padding:3px}.ptit1-head{flex-basis:46px}.ptit1-active{flex-basis:108px}.ptit1-bonus-strip{flex-basis:44px}.ptit1-kpis{flex-basis:40px}.ptit1-tools{flex-basis:42px}.ptit1-tool{height:42px}.ptit1-visit{flex-basis:32px}
        .ptit1-active__grid{grid-template-columns:minmax(0,1fr) 108px;padding:5px}.ptit1-radar-stack{width:108px;min-width:108px}.ptit1-identity-content.is-solo{padding-left:62px}.ptit1-identity-content.is-team{grid-template-columns:38px minmax(0,1fr);padding:5px}.ptit1-identity-avatar.is-overlay{transform:scale(.84)}.ptit1-player-name{font-size:8.5px}.ptit1-score-value{font-size:31px}.ptit1-turn-row{margin-top:4px}
      }
    `}</style>
    <PremiumMomentOverlay moment={moment} accent={moment?.playerId ? (colorById.get(String(moment.playerId)) || activeColor) : activeColor} profile={moment?.playerId ? profileById.get(String(moment.playerId)) : activeProfile} playerName={moment?.playerId ? nameById(moment.playerId) : activePlayer?.name} />
    <Ptit1HitCard card={hitCard} />
    <Ptit1VisitCard card={visitCard} profile={visitCard?.playerId ? profileById.get(String(visitCard.playerId)) : null} />

    <header className="ptit1-head">
      <img src={tickerPtitHun} alt="P’TIT 1" draggable={false} />
      <div className="ptit1-head__controls">
        <div><BackDot onClick={() => go?.("ptit_hun_config")} color={activeColor} glow={`${activeColor}88`} size={36} /></div>
        <div>
          <button type="button" className={`ptit1-sound-toggle${sfxEnabled ? "" : " is-off"}`} aria-label={sfxEnabled ? "Couper les bruitages P’TIT 1" : "Activer les bruitages P’TIT 1"} title={sfxEnabled ? "Bruitages P’TIT 1 : ON" : "Bruitages P’TIT 1 : OFF"} onClick={() => setSfxEnabled((value:boolean) => { const next = !value; if (next) { void unlockPtit1Audio(true); window.setTimeout(() => playPtit1Sfx("inner", true), 20); } return next; })}>{sfxEnabled ? "🔊" : "🔇"}</button>
          {awenaEnabled ? <PremiumAwenaButton awena={awena} route="ptit_hun_play" mode="ptit_hun" screenLabel="P’TIT 1 · Partie" accent={activeColor} /> : null}
        </div>
      </div>
    </header>

    <main className="ptit1-stage">
      <div className="ptit1-left">
        <section className="ptit1-active">
          <div className="ptit1-active__grid">
            <div className="ptit1-active__mission">
              {activeTeamLogo ? <img className="ptit1-identity-watermark is-team" src={activeTeamLogo} alt="" draggable={false} /> : <div className="ptit1-identity-avatar-watermark"><ProfileAvatar profile={activeProfile} size={96} showStars={false} ringColor="transparent" noFrame /></div>}
              <div className="ptit1-identity-gradient" />
              <div className={`ptit1-identity-content${activeTeamLogo ? " is-team" : " is-solo"}`}>
                {activeTeamLogo ? <div className="ptit1-identity-avatar is-overlay"><ProfileAvatar profile={activeProfile} size={42} showStars={false} ringColor={activeColor} /></div> : null}
                <div className="ptit1-score-center">
                  {activeTeamName ? <div className="ptit1-team-name">{activeTeamName}</div> : null}
                  <div className="ptit1-player-name">{activePlayer?.name || (fr ? "Joueur" : "Player")}</div>
                  <div className="ptit1-score-value">{currentThrow.length ? liveProjection.score : score}</div>
                  <div className="ptit1-turn-row"><span>{fr ? "TOUR" : "VISIT"}</span><b>{round}/{config.rules.rounds}</b></div>
                </div>
              </div>
            </div>
            <div className="ptit1-radar-stack">
              <div className="ptit1-radar-label">{ptit1ZonesLabel()}</div>
              <button type="button" className="ptit1-radar-button" onClick={() => setFocusOpen(true)} aria-label={`${ptit1ZonesLabel()} P’TIT 1`}>
                <img src={ptit1Radar} alt="" draggable={false} />
              </button>
              <div className="ptit1-jackpot-row"><span>JACKPOT</span><b>{jackpotLabel}</b></div>
            </div>
          </div>
        </section>

        <section className="ptit1-bonus-strip">
          <Ptit1ProgressCard label={fr ? "ZÉRO ABSOLU" : "ABSOLUTE ZERO"} value={zeroProgress} color={BLUE} active={config.rules.dbullEnabled && config.rules.zeroAbsoluteEnabled} onClick={() => setZeroOpen(true)} />
          <Ptit1ProgressCard label={fr ? "BOUCLIER DU HUN" : "HUN SHIELD"} value={shieldProgress} color={GREEN} active={config.rules.shieldEnabled} onClick={() => setShieldOpen(true)} />
        </section>

        <section className="ptit1-kpis">
          <Ptit1MiniKpi label="SCORE" value={score} color={activeColor} onClick={() => setStatsOpen(true)} />
          <Ptit1MiniKpi label="P’TIT 1" value={activeStats.petitOneHits || 0} color={ACCENT} onClick={() => setStatsOpen(true)} />
          <Ptit1MiniKpi label={fr ? "VOLÉES 0" : "ZERO VISITS"} value={activeStats.zeroVisits || 0} color={GREEN} onClick={() => setStatsOpen(true)} />
          <Ptit1MiniKpi label="JACKPOT" value={activeStats.jackpotVisits || 0} color="#ffd84d" onClick={() => setStatsOpen(true)} />
        </section>

        <section className="ptit1-tools">
          <button type="button" className="ptit1-tool" onClick={() => setRankingOpen(true)} aria-label={fr ? "Classement" : "Ranking"}><Ptit1ToolIcon kind="ranking" /></button>
          <button type="button" className="ptit1-players" onClick={() => setPlayersOpen(true)} aria-label={fr ? "Ouvrir la liste des joueurs" : "Open player list"}>
            <div>
              {state.players.slice(0, 8).map((p:any) => { const id=String(p.id); const color=colorById.get(id)||ACCENT; return <span key={id} style={{ width: 30, height: 30, marginLeft: -5, borderRadius: 999, overflow: "hidden", border: `2px solid ${color}`, background: "#070910", display: "grid", placeItems: "center", boxShadow: id === String(activePlayer?.id || "") ? `0 0 12px ${color}88` : "none" }}><ProfileAvatar profile={profileById.get(id) || p} size={28} showStars={false} ringColor={color} noFrame /></span>; })}
              <b style={{ marginLeft: 7, color: activeColor, fontSize: 8.5, fontWeight: 1100, letterSpacing: .65 }}>{fr ? "JOUEURS" : "PLAYERS"}</b>
            </div>
          </button>
          <button type="button" className="ptit1-tool" onClick={() => setStatsOpen(true)} aria-label={fr ? "Statistiques" : "Statistics"}><Ptit1ToolIcon kind="stats" /></button>
          <button type="button" className="ptit1-tool" onClick={() => setLogOpen(true)} aria-label={fr ? "Journal" : "Log"}><Ptit1ToolIcon kind="log" /></button>
        </section>

        <section className="ptit1-visit">
          <Ptit1DartsRow currentThrow={currentThrow} accent={activeColor} liveScore={liveProjection.score} liveDelta={liveProjection.delta} liveSteps={liveProjection.steps} />
        </section>
      </div>

      <div className="ptit1-input">
        {!activeIsBot ? <div className="ptit1-scorehub"><ScoreInputHub
          currentThrow={currentThrow as any}
          multiplier={multiplier}
          onSimple={() => { setMultiplier(1); setSingleRing(null); }}
          onDouble={() => { setMultiplier(2); setSingleRing(null); }}
          onTriple={() => { setMultiplier(3); setSingleRing(null); }}
          onBackspace={() => setCurrentThrow((prev:UIDart[]) => prev.slice(0,-1))}
          onCancel={() => { setCurrentThrow([]); setMultiplier(1); setSingleRing(null); }}
          onNumber={(n:number) => { if (!segmentZoneSelected) return; appendKeypadDart({ v:n, mult:multiplier } as any); }}
          onBull={addBull25}
          onValidate={validate}
          onDirectDart={(d:any) => appendKeypadDart(d)}
          onSetVisitDarts={(darts:any[]) => setThrowWithSfx((darts||[]).slice(0,3).map((d:any)=>ringDecorator(d)))}
          validateLabel={fr ? "VALIDER LA VOLÉE" : "VALIDATE VISIT"}
          validateDisabled={currentThrow.length < 3}
          preferredMethod={config.scoreInputMethod}
          keypadExtraMainButtons={[
            { label: fr ? "PETIT" : "SMALL", onClick: () => { setMultiplier(1); setSingleRing((v:any) => v === "inner_single" ? null : "inner_single"); }, active: singleRing === "inner_single", tone: "yellow", title: fr ? "Petit simple · valeur normale" : "Small single · normal value" },
            { label: fr ? "GROS" : "BIG", onClick: () => { setMultiplier(1); setSingleRing((v:any) => v === "outer_single" ? null : "outer_single"); }, active: singleRing === "outer_single", tone: "orange", title: fr ? `Gros simple · valeur ×${config.rules.outerSingleFactor}` : `Big single · value ×${config.rules.outerSingleFactor}` },
          ]}
          keypadLayoutVariant="ptit1"
          keypadDisableSegmentNumbers={!segmentZoneSelected}
          keypadAuxActionOverride={{ label: fr ? "ZONE SPÉCIALES" : "SPECIAL ZONES", icon: <img src={gros6ZonesKeypad} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />, onClick: () => setSpecialOpen(true), tone: "gold", title: fr ? "Ouvrir les zones spéciales" : "Open special zones", ariaLabel: fr ? "Ouvrir les zones spéciales" : "Open special zones", fullBleedIcon: true }}
          keypadSecondaryAction={currentThrow.length < 3 ? { icon: <span style={{ fontSize: 10.5, fontWeight: 1100, letterSpacing: .4 }}>MISS</span>, onClick: () => appendKeypadDart({ v: 0, mult: 1 } as any), tone: "red", title: fr ? "Ajouter un MISS" : "Add a MISS", ariaLabel: fr ? "Ajouter un MISS" : "Add a MISS" } : null}
          keypadFooterAction={currentThrow.length >= 3 ? { label: fr ? "VALIDER" : "VALIDATE", title: fr ? "Valider la volée" : "Validate visit", tone: "gold", onClick: validate } : { label: "DBULL", title: "Double Bull", tone: "green", onClick: addDbull }}
          hidePreview
          hideTotal
          showPlaceholders={false}
          hideSwitcher
          hideTabs
          switcherMode="hidden"
          fitToParent
          fitMinScale={0.60}
        /></div> : <BotTurn profile={activeProfile} name={activePlayer?.name} accent={activeColor} text={config.rules.jackpotEnabled ? (fr ? `cherche ${state.jackpotTargets.map((t:any) => t.label).join("/")} ou les petits simples…` : `aiming for ${state.jackpotTargets.map((t:any) => t.label).join("/")} or small singles…`) : (fr ? "cherche les petits simples et le DBULL…" : "aiming for small singles and DBULL…")} icon="1" />}
      </div>
    </main>

    {playersOpen ? <Ptit1PlayersModal rows={playersRows} onClose={() => setPlayersOpen(false)} /> : null}
    {statsOpen ? <StatsModal items={statsItems} accent={activeColor} subtitle={activePlayer?.name} onClose={() => setStatsOpen(false)} /> : null}
    {logOpen ? <LogModal visits={state.visits} profileById={profileById} colorById={colorById} labelDart={ptit1DisplayDartLabel} title={fr ? "JOURNAL P’TIT 1" : "P’TIT 1 LOG"} onClose={() => setLogOpen(false)} /> : null}
    {rankingOpen ? <RankingModal rows={rankingRows} title={fr ? "CLASSEMENT · LE PLUS NUL D’ABORD" : "RANKING · LOWEST SCORE FIRST"} onClose={() => setRankingOpen(false)} /> : null}
    {focusOpen ? <FloatingPanel title={fr ? "P’TIT 1 · CIBLE & RISQUES" : "P’TIT 1 · BOARD & RISKS"} subtitle={fr ? "Les détails restent hors de l’écran de jeu" : "Details stay outside the main play screen"} onClose={() => setFocusOpen(false)}><PtitHunRiskBoard state={state} playerId={activePlayer?.id} currentThrow={currentThrow} preview={preview} /><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 9 }}><figure style={{ margin: 0, overflow: "hidden", borderRadius: 12, border: `1px solid ${GREEN}44`, background: "#05070b" }}><img src={ptit1CurrentLang() === "fr" ? smallSingleZoneVisual : smallSingleZoneVisualEn} alt={ptit1CurrentLang() === "fr" ? "Zone de petit simple" : "Small single zone"} style={{ width: "100%", display: "block", aspectRatio: "1/1", objectFit: "contain" }}/><figcaption style={{ padding: "7px 8px", textAlign: "center", color: GREEN, fontSize: 8, fontWeight: 1000, letterSpacing: .6 }}>{ptit1CurrentLang() === "fr" ? "PETIT SIMPLE" : "SMALL SINGLE"}</figcaption></figure><figure style={{ margin: 0, overflow: "hidden", borderRadius: 12, border: `1px solid ${ACCENT}44`, background: "#05070b" }}><img src={ptit1CurrentLang() === "fr" ? bigSingleZoneVisual : bigSingleZoneVisualEn} alt={ptit1CurrentLang() === "fr" ? "Zone de gros simple" : "Large single zone"} style={{ width: "100%", display: "block", aspectRatio: "1/1", objectFit: "contain" }}/><figcaption style={{ padding: "7px 8px", textAlign: "center", color: ACCENT, fontSize: 8, fontWeight: 1000, letterSpacing: .6 }}>{ptit1CurrentLang() === "fr" ? "GROS SIMPLE" : "LARGE SINGLE"}</figcaption></figure></div></FloatingPanel> : null}
    {zeroOpen ? <Ptit1BonusModal kind="zero" state={state} playerId={activePlayer?.id} onClose={() => setZeroOpen(false)} /> : null}
    {shieldOpen ? <Ptit1BonusModal kind="shield" state={state} playerId={activePlayer?.id} onClose={() => setShieldOpen(false)} /> : null}
    {specialOpen ? <Ptit1SpecialZonesModal onClose={() => setSpecialOpen(false)} onPick={addSpecialZone} accent={activeColor} /> : null}
  </div>;
}
