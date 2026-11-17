// @ts-nocheck
// =============================================================
// PRÉSIDENT — Play complet
// Main virtuelle, plis, S/D/T, PASSER, taxes, bots, stats/history.
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import DartboardClickable from "../components/DartboardClickable";
import InfoDot from "../components/InfoDot";
import Keypad from "../components/Keypad";
import PageHeader from "../components/PageHeader";
import tickerPresident from "../assets/tickers/ticker_president.png";
import awenaAdviceBubble from "../assets/president/awena_conseils.webp";
import { mssPresidentCardUrl, mssJokerCardUrl } from "../lib/mssLegendsDeck";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import type { GameDart } from "../lib/types-game";
import {
  clonePresidentState,
  createPresidentState,
  getPresidentStandings,
  passPresidentTurn,
  playPresidentTurn,
  presidentAutoTarget,
  resolvePresidentTax,
  presidentDefaultTaxIndices,
  presidentCanPlayerPlay,
  presidentDartLabel,
  presidentLegalTargets,
  presidentRoleForRank,
  presidentCardRank,
  presidentCardKilos,
  presidentTargetDescription,
  presidentTargetLabel,
  presidentCardsPerPlayer,
  type PresidentComboSize,
  type PresidentConfigPayload,
  type PresidentState,
  type PresidentTarget,
} from "../lib/gameEngines/presidentEngine";

const GOLD = "#e9c56c";
type UiDart = { v: number; mult: 1 | 2 | 3 };
type KpiIconName = "cards" | "tricks" | "success" | "power" | "darts" | "single" | "pair" | "triple" | "pass" | "taxes" | "miss";

function playerName(p: any) { return p?.name || p?.displayName || p?.display_name || p?.pseudo || "Joueur"; }
function isBotProfile(p: any, ids: Set<string>) { return ids.has(String(p?.id || "")) || Boolean(p?.isBot || p?.bot || p?.botLevel || p?.kind === "bot"); }
function toGameDart(d: UiDart): GameDart {
  if (!d || d.v === 0) return { bed: "MISS" };
  if (d.v === 25) return { bed: d.mult === 2 ? "IB" : "OB" };
  return { bed: d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S", number: d.v } as GameDart;
}
function dartMatchesUi(config: PresidentConfigPayload, target: PresidentTarget, d: UiDart) {
  if (config.variant === "chaos" && config.coupEtat && d.v === 25 && d.mult === 2) return true;
  if (target.value === 25) return d.v === 25 && d.mult === 1;
  if (target.value === 50) return d.v === 25 && d.mult === 2;
  if (config.variant === "chaos" && config.bullJoker && target.size === 1 && d.v === 25 && d.mult === 1) return true;
  const expected = target.size;
  return d.v === target.value && d.mult === expected;
}
function normalizeConfig(props: any): PresidentConfigPayload & {
    participantMode?: "players" | "teams";
    teamConfigs?: any[];
} {
    const raw = props?.params?.config || props?.config || props?.params || {};
    return {
        mode: "president",
        players: Math.max(3, Math.min(8, Number(raw?.players || raw?.selectedIds?.length || 3))),
        selectedIds: Array.isArray(raw?.selectedIds) ? raw.selectedIds.map(String).slice(0, 8) : [],
        playersList: Array.isArray(raw?.playersList) ? raw.playersList : [],
        playerDartSets: raw?.playerDartSets || {},
        botIds: Array.isArray(raw?.botIds) ? raw.botIds.map(String) : [],
        botsEnabled: Boolean(raw?.botsEnabled),
        botLevel: raw?.botLevel === "easy" || raw?.botLevel === "hard" ? raw.botLevel : "normal",
        rounds: ([1, 3, 5, 7, 10].includes(Number(raw?.rounds)) ? Number(raw.rounds) : 5) as any,
        handSize: presidentCardsPerPlayer(
          Math.max(3, Math.min(8, Number(raw?.selectedIds?.length || raw?.players || 3))),
          Math.max(5, Math.min(16, Number(raw?.handSize || 10)))
        ),
        deckCopies: 1,
        variant: raw?.variant === "chaos" ? "chaos" : "classic",
        randomOrder: Boolean(raw?.randomOrder),
        bullJoker: raw?.variant === "chaos" && raw?.bullJoker !== false,
        coupEtat: raw?.variant === "chaos" && raw?.coupEtat !== false,
        revolution: raw?.variant === "chaos" && raw?.revolution !== false,
        scoreInputMethod: raw?.scoreInputMethod === "dartboard" ? "dartboard" : "keypad",
        // Préparation visuelle du futur mode équipes : aucun changement du moteur actuel.
        participantMode: raw?.participantMode === "teams" ? "teams" : "players",
        teamConfigs: Array.isArray(raw?.teamConfigs) ? raw.teamConfigs : [],
    } as any;
}
function panel(): React.CSSProperties { return { borderRadius: 18, padding: 11, background: "linear-gradient(180deg,rgba(255,255,255,.058),rgba(0,0,0,.28))", border: "1px solid rgba(255,255,255,.09)", boxShadow: "0 14px 30px rgba(0,0,0,.32)", boxSizing: "border-box", minWidth: 0 }; }
function roleColor(role: string, primary: string) { if (role === "Président") return "#ffd76a"; if (role === "Trou du cul") return "#ff7a91"; if (role === "Vice-Président") return primary; if (role === "Vice-Trou du cul") return "#ff9f63"; return "#b8c0d9"; }
function formatPct(a: number, b: number) { return b ? Math.round((a / b) * 1000) / 10 : 0; }
function fmtTime(ms: number) { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2,"0")}`; }

const SUITS = ["♠", "♥", "♣", "♦"];
function cardSuit(value: number, suitIndex = 0) { return SUITS[Math.abs(suitIndex) % SUITS.length]; }
function cardIsRed(value: number, suitIndex = 0) { const s = cardSuit(value, suitIndex); return s === "♥" || s === "♦"; }
function PlayingCard({ value, mini = false, ghost = false, suitIndex = 0 }: {
    value: number;
    mini?: boolean;
    ghost?: boolean;
    suitIndex?: number;
}) {
    const suit = cardSuit(value, suitIndex);
    const rank = presidentCardRank(value);
    const w = mini ? 43 : 58;
    const h = mini ? 61 : 82;
    const imageUrl = value === 25 ? mssJokerCardUrl("hawaii-501")
      : value === 50 ? mssJokerCardUrl("king-of-bling")
      : mssPresidentCardUrl(suitIndex, value);
    // The suit index comes from the President engine's actual dealt card.
    // No substitution of suits or hidden cards: this is presentation only.
    return <div aria-label={`Carte ${rank} ${suit}`} style={{
      width:w,height:h,position:"relative",flex:"0 0 auto",borderRadius:mini?6:8,
      overflow:"hidden",boxSizing:"border-box",opacity:ghost?.72:1,
      boxShadow:ghost?"none":"0 4px 10px rgba(0,0,0,.48)",
      background:"#fff8e9",
    }}>
      {imageUrl ? <img src={imageUrl} alt="" loading="lazy" decoding="async" draggable={false}
         style={{display:"block",width:"100%",height:"100%",objectFit:"fill"}} /> :
       <div style={{width:"100%",height:"100%",color:cardIsRed(value,suitIndex)?"#c92e38":"#13161d",display:"grid",placeItems:"center",fontFamily:"Georgia,serif",fontSize:22}}>{rank}{suit}</div>}
    </div>;
}
/** Joker granted by BULL in CHAOS: an effect, not an extra dealt card. */
function PresidentJokerCard({ variant = "hawaii-501", mini = false }: { variant?: "hawaii-501" | "king-of-bling"; mini?: boolean }) {
  return <img src={mssJokerCardUrl(variant)} alt={variant === "hawaii-501" ? "Joker HAWAII 501" : "Joker KING OF BLING"}
    loading="lazy" decoding="async" draggable={false}
    style={{display:"block",width:mini?43:58,height:mini?61:82,objectFit:"fill",flex:"0 0 auto"}}/>;
}
function HandCardStack({ value, count, suits = [] }: {
    value: number;
    count: number;
    suits?: number[];
}) {
    const visible = Math.min(3, Math.max(1, count));
    return <div title={`${count} carte${count > 1 ? "s" : ""} de valeur ${value}`} style={{ position: "relative", height: 72, minWidth: 58, paddingRight: (visible - 1) * 5, flex: "0 0 auto" }}>
    {Array.from({ length: visible }, (_, i) => <div key={i} style={{ position: "absolute", left: i * 5, top: i * 2, transform: `rotate(${(i - (visible - 1) / 2) * 2.2}deg)`, transformOrigin: "50% 90%" }}><PlayingCard value={value} suitIndex={suits[i] ?? i} mini/></div>)}
    {count > 1 ? <div style={{ position: "absolute", right: -1, top: -5, zIndex: 5, minWidth: 20, height: 20, borderRadius: 999, padding: "0 4px", boxSizing: "border-box", background: "#090b10", border: "1px solid rgba(255,215,106,.72)", color: "#ffd76a", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 1100 }}>×{count}</div> : null}
  </div>;
}
function ComboCardFan({ target, compact = false }: {
    target: PresidentTarget | null;
    compact?: boolean;
}) {
    if (!target)
        return null;
    const count = Math.max(1, Math.min(3, Number(target.size || 1)));
    const scale = compact ? .77 : 1;
    const spread = compact ? 19 : 28;
    return <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: compact ? .14 : .16, pointerEvents: "none", zIndex: 0, filter: "saturate(.72) contrast(.96)" }}>
    <div style={{ position: "relative", width: (58 + spread * (count - 1)) * scale, height: 82 * scale }}>
      {Array.from({ length: count }, (_, i) => {
            const mid = (count - 1) / 2;
            const dx = (i - mid) * spread * scale;
            const rot = (i - mid) * (compact ? 7 : 9);
            return <div key={i} style={{ position: "absolute", left: `calc(50% - ${29 * scale}px)`, top: 0, transform: `translateX(${dx}px) rotate(${rot}deg) scale(${scale})`, transformOrigin: "50% 70%" }}><PlayingCard value={target.value} suitIndex={i} ghost/></div>;
        })}
    </div>
  </div>;
}
function RuleStep({ n, title, color, children }: any) {
    return <div style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr)", gap: 9, alignItems: "start" }}>
    <div style={{ width: 26, height: 26, borderRadius: 999, border: `1px solid ${color}88`, background: `${color}14`, color, display: "grid", placeItems: "center", fontWeight: 1100, fontSize: 11 }}>{n}</div>
    <div><div style={{ color, fontWeight: 1100, fontSize: 11, letterSpacing: .55 }}>{title}</div><div style={{ marginTop: 2, color: "rgba(255,255,255,.78)", fontSize: 11.5, lineHeight: 1.48 }}>{children}</div></div>
  </div>;
}

function AwenaMedallion({ size = 34 }: { size?: number }) {
  return <img src="/awena/awena-avatar.webp" alt="Awena" draggable={false} style={{ width:size, height:size, borderRadius:999, objectFit:"cover", flex:"0 0 auto", border:"2px solid rgba(120,247,219,.75)", boxShadow:"0 0 0 2px rgba(15,20,24,.75), 0 0 18px rgba(63,233,201,.25)", background:"#091018" }} />;
}

function AdviceTabButton({ active, color, onClick, children }: any) {
  return <button type="button" onClick={onClick} style={{ minHeight:36, borderRadius:999, padding:"0 12px", border:`1px solid ${active ? color : "rgba(255,255,255,.14)"}`, background: active ? `${color}20` : "rgba(255,255,255,.04)", color: active ? color : "rgba(255,255,255,.86)", fontWeight:1000, fontSize:10.5, cursor:"pointer", whiteSpace:"nowrap" }}>{children}</button>;
}

function AdviceTabsContent({
  tab,
  setTab,
  primary,
  selectedTarget,
  recommendedTarget,
  recommendationReason,
  objectiveExplanation,
  objectiveInstruction,
  activeCanPlay,
  currentTarget,
  handCount,
  onOpenInput,
}: any) {
  const targetLabel = selectedTarget ? presidentTargetLabel(selectedTarget) : "Aucun coup sélectionné";
  const recommendedLabel = recommendedTarget ? presidentTargetLabel(recommendedTarget) : "Aucun conseil disponible";
  const tabs = [
    { key: "conseil", label: "💡 CONSEIL" },
    { key: "strategie", label: "♟ STRATÉGIE" },
    { key: "viser", label: "🎯 COMMENT VISER" },
    { key: "regles", label: "📘 RÈGLES" },
  ];
  return <div style={{ display:"grid", gap:12 }}>
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"4px 2px 0" }}>
      <AwenaMedallion size={42} />
      <div style={{ minWidth:0 }}>
        <div style={{ color:"#8ff6d2", fontWeight:1100, fontSize:12, letterSpacing:.8 }}>AWENA · CONSEIL DE JEU</div>
        <div style={{ color:"rgba(255,255,255,.72)", fontSize:11, lineHeight:1.4 }}>Je t'explique quoi jouer, pourquoi le jouer, et comment le viser simplement.</div>
      </div>
    </div>
    <div style={{ display:"flex", gap:7, overflowX:"auto", paddingBottom:2 }}>
      {tabs.map((entry:any)=><AdviceTabButton key={entry.key} active={tab===entry.key} color={primary} onClick={()=>setTab(entry.key)}>{entry.label}</AdviceTabButton>)}
    </div>
    {tab === "conseil" ? <div style={{ display:"grid", gap:10, fontSize:12, lineHeight:1.55 }}>
      <div style={{ ...panel(), borderColor:"#79eec466", background:"linear-gradient(180deg,rgba(8,39,34,.92),rgba(5,22,20,.92))" }}>
        <div style={{ color:"#8ff6d2", fontWeight:1100 }}>CE QUE TU DOIS FAIRE MAINTENANT</div>
        <div style={{ marginTop:5 }}>{objectiveExplanation}</div>
        <div style={{ marginTop:7, color:"#fff1ba", fontWeight:1000 }}>{objectiveInstruction}</div>
      </div>
      <div style={{ ...panel(), borderColor:"#f0cf7666" }}>
        <div style={{ color:"#ffd789", fontWeight:1100 }}>COUP SÉLECTIONNÉ</div>
        <div style={{ marginTop:5 }}><b>{targetLabel}</b>{selectedTarget ? ` · ${selectedTarget.size===1?"1 carte":selectedTarget.size===2?"2 cartes identiques":"3 cartes identiques"}` : ""}</div>
        <div style={{ marginTop:5, color:"rgba(255,255,255,.76)" }}>{selectedTarget ? `Si tu confirmes ce choix, ouvre SAISIE puis tente exactement ${selectedTarget.value===25?"BULL25":selectedTarget.value===50?"DBULL50":`${selectedTarget.size===1?"le simple":selectedTarget.size===2?"le double":"le triple"} ${selectedTarget.value}`}.` : "Choisis une carte de ta main pour voir la consigne exacte."}</div>
      </div>
      <div style={{ ...panel(), borderColor:`${primary}66` }}>
        <div style={{ color:primary, fontWeight:1100 }}>COUP RECOMMANDÉ PAR AWENA</div>
        <div style={{ marginTop:5 }}><b>{recommendedLabel}</b></div>
        <div style={{ marginTop:5, color:"rgba(255,255,255,.78)" }}>{recommendationReason}</div>
      </div>
      <button type="button" style={{ minHeight:44, borderRadius:12, border:`1px solid ${primary}66`, background:`linear-gradient(110deg,${primary}33,rgba(255,255,255,.06))`, color:primary, fontWeight:1100, cursor: activeCanPlay ? "pointer" : "default" }} onClick={onOpenInput} disabled={!activeCanPlay}><span style={{display:"inline-flex",alignItems:"center",gap:8}}><KpiIcon name="darts" size={18}/> OUVRIR LA SAISIE</span></button>
    </div> : null}
    {tab === "strategie" ? <div style={{ display:"grid", gap:10, fontSize:12, lineHeight:1.55 }}>
      <div style={{ ...panel(), borderColor:"#6ce7ff55" }}><div style={{ color:"#6ce7ff", fontWeight:1100 }}>L'IDÉE GÉNÉRALE</div><div style={{ marginTop:5 }}>Au Président, ton but est de <b>vider ta main avant les autres</b>. En début de pli, il est souvent judicieux de jouer des <b>petites cartes</b> pour t'alléger, tout en gardant quelques cartes fortes pour reprendre la main plus tard.</div></div>
      <div style={{ ...panel(), borderColor:"#d6b06055" }}><div style={{ color:"#ffd789", fontWeight:1100 }}>QUAND GARDER TES GROSSES CARTES ?</div><div style={{ marginTop:5 }}>Les <b>As</b>, les <b>2</b> et les Jokers uniques sont puissants. Les conserver peut t'aider à battre un pli important ou à reprendre l'initiative quand les autres montent en valeur.</div></div>
      <div style={{ ...panel(), borderColor:"#8ff6d255" }}><div style={{ color:"#8ff6d2", fontWeight:1100 }}>QUAND JOUER UNE PAIRE OU UN BRELAN ?</div><div style={{ marginTop:5 }}>Si la table est libre et que tu veux évacuer plusieurs cartes d'un coup, une <b>paire</b> ou un <b>brelan</b> peut être excellent. Mais si cela te fait brûler une combinaison très forte trop tôt, une petite carte simple peut rester plus prudente.</div></div>
      <div style={{ ...panel(), borderColor:`${primary}66` }}><div style={{ color:primary, fontWeight:1100 }}>DANS TA SITUATION</div><div style={{ marginTop:5 }}>{recommendationReason}</div></div>
    </div> : null}
    {tab === "viser" ? <div style={{ display:"grid", gap:10, fontSize:12, lineHeight:1.55 }}>
      <div style={{ ...panel(), borderColor:"#8ff6d255" }}><div style={{ color:"#8ff6d2", fontWeight:1100 }}>TRADUCTION DES COUPS</div><div style={{ marginTop:5 }}><b>S</b> = Simple = 1 carte. <b>D</b> = Double = 2 cartes identiques. <b>T</b> = Triple = 3 cartes identiques.</div><div style={{ marginTop:5 }}>Exemples : <b>S3</b> = vise le simple 3 pour poser un 3. <b>D7</b> = vise le double 7 pour poser une paire de 7. <b>T9</b> = vise le triple 9 pour poser un brelan de 9.</div></div>
      <div style={{ ...panel(), borderColor:"#ffb17f55" }}><div style={{ color:"#ffb17f", fontWeight:1100 }}>TES 3 FLÉCHETTES</div><div style={{ marginTop:5 }}>Tu disposes de <b>3 fléchettes maximum</b>. Un seul impact exact suffit pour réussir le coup et poser les cartes choisies. Si aucun impact n'est bon, tu ne poses rien.</div></div>
      <div style={{ ...panel(), borderColor:"#6ce7ff55" }}><div style={{ color:"#6ce7ff", fontWeight:1100 }}>EN PRATIQUE</div><div style={{ marginTop:5 }}>{selectedTarget ? `Ton choix actuel est ${presidentTargetLabel(selectedTarget)}. Il faut donc viser exactement ${selectedTarget.value===25?"BULL25":selectedTarget.value===50?"DBULL50":`${selectedTarget.size===1?"le simple":selectedTarget.size===2?"le double":"le triple"} ${selectedTarget.value}`}.` : "Choisis d'abord une carte dans ta main, puis ouvre SAISIE pour voir la cible à viser."}</div></div>
    </div> : null}
    {tab === "regles" ? <div style={{ display:"grid", gap:10, fontSize:12, lineHeight:1.58 }}>
      <div style={{ ...panel(), borderColor:"#8ff6d255" }}><div style={{ color:"#8ff6d2", fontWeight:1100 }}>BUT DU JEU</div><div style={{ marginTop:5 }}>Être le <b>premier joueur à vider sa main</b>. Le premier devient <b>Président</b>. Le dernier devient <b>Trou du cul</b>.</div></div>
      <div style={{ ...panel(), borderColor:"#f0cf7666" }}><div style={{ color:"#ffd789", fontWeight:1100 }}>CLASSEMENT ET POINTS</div><div style={{ marginTop:5 }}>Le premier à vider sa main devient Président et reçoit N−1 points pour N participants ; chaque place suivante rapporte un point de moins. Le dernier, Trou du cul, reçoit 0 point. Exemple à 5 joueurs : <b>4, 3, 2, 1, 0</b>. Les points se cumulent au fil des manches. Gagner un pli n'ajoute aucun point. <b>Pas de kilos ni de chasse d’eau au Président.</b></div></div>
      <div style={{ ...panel(), borderColor:"#f0cf7666" }}><div style={{ color:"#ffd789", fontWeight:1100 }}>ORDRE DES CARTES</div><div style={{ marginTop:5 }}>De la plus petite à la plus forte : <b>3, 4, 5, 6, 7, 8, 9, 10, Valet, Dame, Roi, As, 2</b>. En classique : 52 cartes distribuées, sans Joker. Les deux Jokers MSS appartiennent seulement à CHAOS. Si tu termines avec un 2, tu es automatiquement classé dernier. Répondre à l’identique avec le même nombre de cartes fait passer le tour du joueur suivant.</div></div>
      <div style={{ ...panel(), borderColor:"#6ce7ff55" }}><div style={{ color:"#6ce7ff", fontWeight:1100 }}>COMMENT JOUER UN PLI</div><div style={{ marginTop:5 }}>Si la table est libre, tu peux ouvrir avec <b>une carte</b>, <b>une paire</b> ou <b>un brelan</b>. Si une combinaison est déjà sur la table, tu dois jouer <b>le même type</b> (simple, paire ou brelan) avec une valeur <b>plus forte</b>{currentTarget ? " que celle affichée" : ""}.</div></div>
      <div style={{ ...panel(), borderColor:"#ffb17f55" }}><div style={{ color:"#ffb17f", fontWeight:1100 }}>PASSER / GAGNER LE PLI</div><div style={{ marginTop:5 }}>Si tu ne peux pas jouer ou si tu préfères attendre, tu peux <b>passer</b>. Quand tous les autres ont passé, le dernier joueur ayant posé une combinaison gagne le pli et ouvre le pli suivant.</div></div>
      <div style={{ ...panel(), borderColor:`${primary}66` }}><div style={{ color:primary, fontWeight:1100 }}>RAPPEL IMPORTANT</div><div style={{ marginTop:5 }}>Sur cette version fléchettes, choisir une combinaison ne suffit pas : il faut aussi <b>réussir la cible correspondante</b> sur le board. Sans impact exact, la combinaison n'est pas posée.</div></div>
    </div> : null}
  </div>;
}

/** Un seul vrai compteur façon carte, identique à celui au-dessus de la main.
 * Sur le plateau, il est seulement réduit en proportion, sans changer le lettrage. */
function PresidentCardCount({ count, color = "#ffd76a", compact = false }: { count: number; color?: string; compact?: boolean }) {
  const visual = <div className="president-card-count" aria-label={`${count} cartes en main`} style={{
    width:34, height:48, flex:"0 0 auto", borderRadius:10,
    border:`1px solid ${compact ? color : "rgba(255,215,110,.55)"}`,
    background:"linear-gradient(180deg,#11161d,#080b10)",
    display:"grid", placeItems:"center", boxSizing:"border-box",
    boxShadow:"0 4px 10px rgba(0,0,0,.28)",
  }}><span style={{fontFamily:"'Trebuchet MS','Arial Rounded MT Bold',system-ui,sans-serif",fontSize:23,fontWeight:1000,color:"#ffd76a",lineHeight:1,letterSpacing:-1.2,textShadow:"0 1px 0 #8e531a,0 2px 1px #000",fontVariantNumeric:"lining-nums tabular-nums"}}>{count}</span></div>;
  return compact ? <div style={{width:28,height:39, flex:"0 0 auto", position:"relative"}}><div style={{position:"absolute",top:0,left:0,transform:"scale(.81)",transformOrigin:"top left"}}>{visual}</div></div> : visual;
}

function roleMiniMeta(role: string) {
  if (role === "Président") return { icon: "♛", label: "Président", color: "#ffd76a" };
  if (role === "Trou du cul") return { icon: "💩", label: "Trou du cul", color: "#ff8f6e" };
  if (role === "Vice-Président") return { icon: "♕", label: "Vice-Président", color: "#6ee7ff" };
  if (role === "Vice-Trou du cul") return { icon: "⬇", label: "Vice-Trou du cul", color: "#ffb36b" };
  return null;
}

function FeltTableCards({ target, history = [], roundNo, trickNo, primary }: {
  target: PresidentTarget | null;
  history?: any[];
  roundNo: number;
  trickNo: number;
  primary: string;
}) {
  // Pile de cartes VRAIMENT posées pendant le pli courant, pas seulement le dernier coup.
  // Le positionnement est stable par carte : rotations et décalages dépendent de l'ordre
  // des coups, pas d'un tirage à chaque render (qui ferait scintiller le tapis).
  const cards: Array<{value:number; suit:number; key:string; playerId:string}> = [];
  for (const event of history || []) {
    if (event.roundNo !== roundNo || event.trickNo !== trickNo || !event.success || !event.target) continue;
    for (let index = 0; index < event.target.size; index += 1) {
      cards.push({value:event.target.value, suit:event.playedSuits?.[index] ?? (index % 4), key:`${event.id}-${index}`, playerId:event.playerId});
    }
  }
  if (!target || cards.length === 0) {
    return <div style={{ minHeight: 118, display:"grid", placeItems:"center", opacity:.95 }}>
      <div style={{ display:"grid", justifyItems:"center", gap:8 }}>
        <div style={{ width:88, height:86, borderRadius:999, display:"grid", placeItems:"center", background:"radial-gradient(circle at 50% 50%, rgba(255,215,106,.18), rgba(255,215,106,.03) 55%, transparent 72%)", color:"rgba(255,221,150,.92)", fontSize:41, textShadow:"0 0 18px rgba(255,215,106,.25)" }}>♛</div>
        <div style={{ padding:"6px 12px", borderRadius:999, border:"1px solid rgba(255,215,106,.32)", background:"rgba(0,0,0,.18)", color:"#f8dc9d", fontWeight:1000, fontSize:10, letterSpacing:.8 }}>OUVERTURE LIBRE</div>
      </div>
    </div>;
  }
  const total = cards.length;
  const position = (index: number) => {
    // Spirale légèrement chaotique : chaque nouvelle carte découvre les coins
    // et bordures des précédentes, avec des angles variés mais toujours lisibles.
    const angle = index * 2.399963229728653; // angle d'or
    const distance = total === 1 ? 0 : Math.min(70, 13 + Math.sqrt(index) * 11);
    const x = Math.cos(angle) * distance + ((index % 3) - 1) * 2;
    const y = Math.sin(angle) * distance * .48 + ((index % 4) - 1.5) * 4;
    const tilt = [-14, 8, -6, 17, -10, 5, 13, -17, 2, 11][index % 10];
    return { x, y, tilt };
  };
  return <div style={{ width:"min(100%,290px)", height:"clamp(110px, 18dvh, 166px)", position:"relative", margin:"0 auto", isolation:"isolate" }} aria-label={`${total} carte${total>1?"s":""} posée${total>1?"s":""} dans le pli`}>
    {cards.map((card, index) => {
      const pos = position(index);
      return <div key={card.key} title={`Carte ${presidentCardRank(card.value)} · joueur ${card.playerId}`} style={{ position:"absolute", left:`calc(50% + ${pos.x}px)`, top:`calc(45% + ${pos.y}px)`, transform:`translate(-50%,-50%) rotate(${pos.tilt}deg)`, transformOrigin:"50% 50%", zIndex:index+1, filter:"drop-shadow(0 5px 8px rgba(0,0,0,.40))", pointerEvents:"none" }}>
        <PlayingCard value={card.value} suitIndex={card.suit} />
      </div>;
    })}
    <div style={{ position:"absolute", zIndex:total+2, bottom:0, left:"50%", transform:"translateX(-50%)", display:"flex", alignItems:"center", gap:7, whiteSpace:"nowrap", padding:"5px 10px", borderRadius:999, background:"rgba(3,24,19,.87)", border:`1px solid ${primary}70`, color:"#ffe3aa", fontWeight:1100, fontSize:10 }}>
      <span>{presidentTargetLabel(target)}</span>
      <span style={{color:"#a8ddc4",fontSize:9}}>· {total} carte{total>1?"s":""}</span>
    </div>
  </div>;
}

/** A completed trick is frozen in this snapshot while the engine has already advanced. */
function PresidentTrickTransition({ data, profilesById, onContinue, primary }: any) {
  const cards: Array<{ value:number; suit:number; key:string }> = [];
  (data.events || []).forEach((event:any) => {
    if (!event.success || !event.target) return;
    for (let i = 0; i < event.target.size; i++) {
      cards.push({ value:event.target.value, suit:event.playedSuits?.[i] ?? (i%4), key:`${event.id}-${i}` });
    }
  });
  const winner = profilesById.get(data.winnerId);
  return <div role="dialog" aria-modal="true" aria-label="Fin du pli — annonce du gagnant" style={{ position:"fixed", inset:0, zIndex:9999, display:"grid", placeItems:"center", padding:12, background:"rgba(0,0,0,.77)", backdropFilter:"blur(6px)" }}>
    <style>{`@keyframes presidentCollectCards { 0%,54% { opacity:1; scale:1; } 90% { opacity:.4; scale:.35; } 100% { opacity:0; scale:.1; } } @media (prefers-reduced-motion: reduce) { .president-collect-card { animation:none !important; } }`}</style>
    <div style={{width:"min(440px,100%)",maxHeight:"min(90dvh,650px)",overflow:"auto",padding:"18px 14px",borderRadius:24,border:"2px solid #d9b760",background:"radial-gradient(ellipse at 50% 40%,#15523e,#05251f 70%,#071614)",boxShadow:"0 0 40px rgba(242,199,93,.24),0 15px 60px #000c",textAlign:"center",display:"grid",gap:12,justifyItems:"center"}}>
      <div style={{fontSize:10,fontWeight:1000,letterSpacing:1.4,color:"#d3ecd9"}}>MANCHE {data.roundNo} · FIN DU PLI {data.trickNo}</div>
      <div style={{display:"grid",placeItems:"center",gap:5}}><span style={{fontSize:36,color:"#f8d77e",filter:"drop-shadow(0 0 15px #ffd76a55)"}}>♛</span><div style={{fontSize:24,fontWeight:1100,color:"#ffe3a0"}}>PLI REMPORTÉ !</div></div>
      <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}><ProfileAvatar profile={winner} size={52}/><div style={{fontSize:17,fontWeight:1000,color:"#fff5d6"}}>{playerName(winner).toUpperCase()}</div></div>
      <div style={{fontSize:11,color:"#b9e4cc",lineHeight:1.55}}>Tous les adversaires ont passé : le dernier joueur à avoir posé des cartes remporte ce pli.</div>
      <div style={{width:"100%",minHeight:135,position:"relative",display:"grid",placeItems:"center",overflow:"hidden",borderRadius:16,background:"radial-gradient(ellipse at center,#185f49,#0a3228 74%)"}}>
        {cards.length ? <div style={{width:220,height:122,position:"relative"}}>{cards.map((card,index)=>{
          const angle = index*2.39996, dist = Math.min(65,11+Math.sqrt(index)*11);
          const x=Math.cos(angle)*dist, y=Math.sin(angle)*dist*.46;
          const tilt=[-13,8,-5,16,-11,4,12,-16][index%8];
          return <div key={card.key} className="president-collect-card" style={{position:"absolute",left:`calc(50% + ${x}px)`,top:`calc(50% + ${y}px)`,transform:`translate(-50%,-50%) rotate(${tilt}deg)`,zIndex:index+1,filter:"drop-shadow(0 4px 7px #0009)",animation:"presidentCollectCards 3.5s ease-in-out forwards"}}><PlayingCard mini value={card.value} suitIndex={card.suit}/></div>;
        })}</div> : <div style={{fontSize:12,color:"#b9e4cc"}}>Pile ramassée</div>}
      </div>
      <div style={{color:"#f4dfa7",fontSize:12,fontWeight:1000}}>{cards.length} carte{cards.length>1?"s":""} sur la table · pli {data.trickNo} terminé</div>
      <div style={{fontSize:12,color:"#dcf4e7",lineHeight:1.55}}>Les cartes posées quittent définitivement les mains.<br/><b style={{color:"#ffdd86"}}>Aucune nouvelle distribution.</b></div>
      <div style={{width:"100%",padding:"10px 12px",borderRadius:12,background:"#0005",border:"1px solid #d9b76055",color:"#b8f4d9",fontWeight:1000,fontSize:12}}>PLI {data.nextTrick} · TABLE LIBRE<br/><span style={{fontWeight:500,fontSize:11,color:"#d7e6db"}}>{playerName(winner)} ouvre le prochain pli.</span></div>
      <button type="button" onClick={onContinue} style={{width:"100%",minHeight:44,borderRadius:13,border:"1px solid #ffe4a3",background:"linear-gradient(90deg,#b98a2f,#ffdf8a)",color:"#181409",fontWeight:1100,fontSize:13,cursor:"pointer"}}>CONTINUER · PLI {data.nextTrick}</button>
      <div style={{fontSize:10,color:"#a9c7b8"}}>Un pli gagné compte dans les statistiques, mais ne rapporte pas directement de points.</div>
    </div>
  </div>;
}

function RulesContent({ config, primary }: any) {
    return <div style={{ display: "grid", gap: 12 }}>
    <div style={{ padding: 10, borderRadius: 14, border: `1px solid ${primary}45`, background: `${primary}0d`, fontSize: 11.5, lineHeight: 1.5 }}><b style={{ color: primary }}>LE PRINCIPE EN UNE PHRASE :</b><br />Tu possèdes une main de cartes avec les rangs 3, 4, …, 10, Valet, Dame, Roi, As et 2{config.variant === "chaos" ? ", ainsi que deux Jokers MSS" : ""}. Pour poser une carte, une paire ou un brelan, tu dois toucher au dartboard le <b>Simple</b>, le <b>Double</b> ou le <b>Triple</b> correspondant.</div>
    <div style={{padding:9,borderRadius:12,border:"1px solid rgba(255,215,106,.32)",background:"rgba(255,215,106,.06)",color:"#f2dfab",fontSize:11,lineHeight:1.5}}><b>{config.variant === "chaos" ? "PAQUET CHAOS · 54 CARTES" : "PAQUET CLASSIQUE · 52 CARTES"}</b> — {config.variant === "chaos" ? "52 cartes et 2 Jokers MSS uniques : HAWAII 501 sur BULL25 et KING OF BLING sur DBULL50. Les mains sont adaptées au nombre de joueurs." : "Un seul exemplaire de chaque carte et enseigne. Toutes les cartes sont distribuées, parfois avec une carte supplémentaire pour certains joueurs."}</div>
    <div style={{padding:10,borderRadius:14,border:"1px solid rgba(255,215,106,.35)",background:"rgba(255,215,106,.06)",fontSize:12,lineHeight:1.55}}><b style={{color:primary}}>POINTS DU PRÉSIDENT</b> — Le premier gagne N−1 points, le dernier 0. À cinq joueurs : 4 / 3 / 2 / 1 / 0. Aucun kilo ni chasse d’eau ici : ces règles appartiennent au jeu KILO DE MERDE.</div>
    <RuleStep n="1" title="OBJECTIF" color={primary}>Sois le premier à vider ta main. Le premier sans carte devient <b>Président</b>. Le dernier devient <b>Trou du cul</b>.</RuleStep>
    <RuleStep n="2" title="COMMENT LIRE S / D / T ?" color="#43d8ff"><b>S7</b> = jouer 1 carte 7 → toucher Simple 7. <b>D7</b> = jouer 2 cartes 7 → toucher Double 7. <b>T7</b> = jouer 3 cartes 7 → toucher Triple 7.</RuleStep>
    <div style={{ ...panel(), padding: 9, borderColor: "rgba(67,216,255,.28)" }}><div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 10, alignItems: "center" }}><div style={{ position: "relative", width: 77, height: 66 }}><div style={{ position: "absolute", left: 0, top: 2, transform: "rotate(-7deg) scale(.72)", transformOrigin: "top left" }}><PlayingCard value={2}/></div><div style={{ position: "absolute", left: 26, top: 2, transform: "rotate(7deg) scale(.72)", transformOrigin: "top left" }}><PlayingCard value={2}/></div></div><div style={{ fontSize: 11.5, lineHeight: 1.45 }}><b style={{ color: "#43d8ff" }}>EXEMPLE — D2</b><br />Ta combinaison est une <b>paire de 2</b>. Tu as jusqu’à 3 fléchettes pour toucher <b>Double 2</b>. Dès que D2 est touché, les 2 cartes « 2 » quittent ta main.</div></div></div>
    <RuleStep n="3" title="OUVERTURE DU PLI" color="#ffd45c">Quand « OUVERTURE LIBRE » est affiché, choisis n’importe quelle combinaison autorisée par ta main : simple, paire ou brelan.</RuleStep>
    <RuleStep n="4" title="RÉPONDRE AU COUP PRÉCÉDENT" color="#72efad">Tu dois garder le <b>même type de combinaison</b> et jouer une valeur supérieure. Exemple : après D7, tu peux jouer D8, D9, D14 (As) ou D2, mais pas S8 ni T8. Une valeur identique avec autant de cartes fait sauter le joueur suivant. Le 2 est la plus forte carte classique, et finir avec un 2 fait perdre la manche.{config.variant === "chaos" ? " Les Jokers MSS sont plus forts que le 2." : ""}</RuleStep>
    <RuleStep n="5" title="3 FLÉCHETTES MAX" color="#c45cff">Le premier impact exact valide immédiatement le coup. Après 3 fléchettes sans réussite, ton tour devient un <b>PASS</b>. Tu peux aussi passer volontairement.</RuleStep>
    <RuleStep n="6" title="FIN DU PLI" color="#ff9b67">Quand tous les autres joueurs ont passé, le dernier joueur ayant réussi un coup gagne le pli et ouvre le suivant librement. <b>Un pli gagné ne donne pas de points</b> : il compte dans tes statistiques et te redonne l’ouverture.</RuleStep>
    <RuleStep n="7" title="FIN DE MANCHE & TAXES" color="#ffcf57">Le classement fixe les rôles. À la manche suivante, le Trou du cul donne ses 2 meilleures cartes au Président, qui lui rend ses 2 plus faibles. À partir de 4 joueurs, Vice-Président et Vice-Trou du cul échangent aussi 1 carte.</RuleStep>
    <div style={{padding:10,borderRadius:12,border:"1px solid #d5ad6355",background:"rgba(12,28,26,.8)",fontSize:11,lineHeight:1.55,color:"#e2ecd9"}}><b style={{color:"#ffde98"}}>BARÈME DE POINTS PRÉSIDENT</b><div style={{marginTop:5}}>Classement par place à chaque manche : <b>pour N joueurs, N−1 points au premier puis un point de moins par place ; 0 au dernier</b>. Exemple à 5 : 4, 3, 2, 1, 0. Les points se cumulent ; le meilleur total remporte le règne. Les plis gagnés sont une statistique. Le système de kilos et la chasse d'eau appartiennent uniquement au jeu KILO DE MERDE.</div></div>
    {config.variant === "chaos" && config.bullJoker ? <div style={{display:"flex",gap:9,alignItems:"center",justifyContent:"center"}}><PresidentJokerCard mini variant="hawaii-501"/><PresidentJokerCard mini variant="king-of-bling"/><span style={{fontSize:10,color:"#e8d8b6",maxWidth:190}}>Jokers MSS : BULL permet de valider une carte simple sélectionnée, sans ajouter de carte fictive à la main.</span></div> : null}
    {config.variant === "chaos" ? <RuleStep n="★" title="VARIANTE CHAOS" color="#ffcf66">BULL = joker simple (illustré par HAWAII 501 ou KING OF BLING) · DBULL = Coup d’État · T14 (As) = Révolution. La Révolution inverse le sens des valeurs pour la manche.</RuleStep> : null}
  </div>;
}

function TargetCard({ selected, tableTarget, revolution, primary }: {
    selected: PresidentTarget | null;
    tableTarget: PresidentTarget | null;
    revolution: boolean;
    primary: string;
}) {
    const label = selected ? presidentTargetLabel(selected) : "—";
    const desc = selected ? presidentTargetDescription(selected) : "AUCUNE CARTE JOUABLE";
    return <div style={{ width: "100%", maxWidth: 190, aspectRatio: "3 / 4", margin: "0 auto", borderRadius: 24, padding: 8, background: "linear-gradient(145deg,#080808,#17120b)", border: `2px solid ${primary}`, boxShadow: `0 0 30px ${primary}32,inset 0 0 0 2px rgba(255,255,255,.035)` }}>
    <div style={{ height: "100%", borderRadius: 17, border: `1px solid ${primary}88`, padding: 13, display: "grid", gridTemplateRows: "auto auto 1fr auto", background: "radial-gradient(circle at 50% 55%,rgba(233,197,108,.12),transparent 46%),linear-gradient(180deg,rgba(255,255,255,.03),rgba(0,0,0,.28))", position: "relative", overflow: "hidden" }}>
      <ComboCardFan target={selected}/>
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", color: primary, fontWeight: 1100, letterSpacing: 1.2, fontSize: 17 }}>♛ PRÉSIDENT</div>
      <div style={{ position: "relative", zIndex: 2, margin: "8px auto 0", padding: "5px 10px", borderRadius: 999, border: `1px solid ${primary}77`, color: "#f8e7b8", fontSize: 9, fontWeight: 1000, letterSpacing: 1.1 }}>{tableTarget ? `À BATTRE ${presidentTargetLabel(tableTarget)}` : "OUVERTURE LIBRE"}</div>
      <div style={{ position: "relative", zIndex: 2, alignSelf: "center", textAlign: "center", minWidth: 0 }}><div style={{ fontFamily: "Georgia,serif", fontSize: 60, lineHeight: .95, fontWeight: 1100, color: primary, textShadow: `0 0 18px ${primary}55` }}>{label}</div><div style={{ marginTop: 9, color: "#f6e5b4", fontWeight: 1000, fontSize: 15, letterSpacing: 1.1 }}>{desc}</div>{revolution ? <div style={{ marginTop: 9, color: "#ff9c6d", fontSize: 10, fontWeight: 1000 }}>↕ RÉVOLUTION ACTIVE</div> : null}</div>
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", color: "rgba(255,255,255,.58)", fontSize: 9 }}>S = simple · D = paire · T = brelan</div>
    </div>
  </div>;
}

function HandStrip({ hand, suits = [], legalTargets, selected, onSelect, primary }: any) {
    const grouped = React.useMemo(() => { const m = new Map<number, number[]>(); (hand || []).forEach((v: number, i: number) => m.set(v, [...(m.get(v) || []), suits[i] ?? 0])); return [...m.entries()].sort((a, b) => (a[0] === 2 ? 15 : a[0]) - (b[0] === 2 ? 15 : b[0])); }, [hand, suits]);
    const legalSet = new Set((legalTargets || []).map((t: any) => `${t.size}:${t.value}`));
    return <div style={{ display: "grid", gap: 9 }}>
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "5px 3px 8px", alignItems: "flex-start" }}>{grouped.map(([value, cardSuits]) => <HandCardStack key={value} value={value} count={cardSuits.length} suits={cardSuits}/>)}</div>
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{legalTargets.map((t: PresidentTarget) => { const active = selected?.value === t.value && selected?.size === t.size; const txt = presidentTargetLabel(t); return <button key={`${t.size}-${t.value}`} onClick={() => onSelect(t)} style={{ minWidth: 54, height: 34, borderRadius: 999, border: `1px solid ${active ? primary : "rgba(255,255,255,.12)"}`, background: active ? `${primary}20` : "rgba(255,255,255,.04)", color: active ? primary : legalSet.has(`${t.size}:${t.value}`) ? "#fff" : "#5f647b", fontWeight: 1000 }}>{txt}</button>; })}</div>
  </div>;
}

/** Compact, non-blocking announcement: the engine remains the authority on the winner. */
function TrickWonBanner({ winner, target, nextTrick, onDismiss }: { winner: string; target: PresidentTarget | null; nextTrick: number; onDismiss: () => void }) {
  return <div role="status" aria-live="polite" style={{animation:"presidentTrickWin .32s ease-out both",border:"1px solid rgba(240,207,121,.54)",borderRadius:13,background:"linear-gradient(100deg,rgba(88,64,20,.92),rgba(23,61,45,.93))",padding:"9px 11px",display:"flex",alignItems:"center",gap:10}}>
    <span aria-hidden="true" style={{fontSize:23}}>🏆</span>
    <div style={{minWidth:0,flex:1}}><div style={{fontWeight:1100,fontSize:12,color:"#ffe49a"}}>{winner} remporte le pli !</div>
    <div style={{fontSize:10,color:"#e3e9d6"}}>{target ? `Dernier coup : ${presidentTargetLabel(target)} · ` : ""}Pli {nextTrick} : table libérée</div></div>
    <button type="button" onClick={onDismiss} aria-label="Masquer l’annonce du pli" style={{background:"rgba(255,255,255,.09)",border:"1px solid rgba(255,255,255,.18)",color:"#fff",borderRadius:999,width:29,height:29,fontSize:17,cursor:"pointer"}}>×</button>
  </div>;
}

/** A combination preview uses the suits actually held, never imaginary suit values. */
function RealComboPreview({ value, size, hand, suits, primary }: { value: number; size: number; hand: number[]; suits: number[]; primary: string }) {
  const matching = hand.map((rank, index) => ({ rank, suit: suits[index], index }))
    .filter(card => card.rank === value).slice(-size).reverse();
  return <div aria-label={`Cartes à poser : ${matching.length}`} style={{display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",padding:"9px 10px",borderRadius:12,border:`1px solid ${primary}66`,background:"rgba(11,36,34,.75)"}}>
    <div style={{display:"grid",gap:3}}><b style={{fontSize:10,color:primary}}>CARTES À POSER</b><span style={{fontSize:10,color:"#d5e9de"}}>{size===1?"CARTE SIMPLE":size===2?"PAIRE":"BRELAN"} · {presidentCardRank(value)}</span></div>
    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{matching.map(card => card.suit === undefined ?
      <div key={card.index} style={{width:43,height:61,borderRadius:6,background:"#f0e6d2",color:"#252525",display:"grid",placeItems:"center",fontFamily:"Georgia,serif",fontWeight:900}}>{presidentCardRank(card.rank)}</div> :
      <PlayingCard key={card.index} value={card.rank} suitIndex={card.suit} mini/>)}</div>
  </div>;
}

function RoleMedal({ role, primary }: { role: string; primary: string }) {
  const symbol = role === "Président" ? "♛" : role === "Vice-Président" ? "♕" : role === "Vice-Trou du cul" ? "♙" : role === "Trou du cul" ? "♟" : "♣";
  return <div aria-label={role} style={{height:46,width:46,borderRadius:13,display:"grid",placeItems:"center",background:`${roleColor(role,primary)}20`,border:`1px solid ${roleColor(role,primary)}66`,color:roleColor(role,primary),fontSize:27}}>{symbol}</div>;
}

function TableCards({ target, suits = [], primary }: { target: PresidentTarget | null; suits?: number[]; primary: string }) {
  return <div style={{ borderRadius:16, border:"1px solid rgba(255,215,110,.25)", background:"radial-gradient(ellipse at center,#184a3c,#0a211f 80%)", padding:"10px 10px 12px", display:"grid", gap:6, justifyItems:"center" }}>
    <div style={{ fontSize:10, fontWeight:1000, color:"#d5e6d4", letterSpacing:1 }}>SUR LA TABLE · À BATTRE</div>
    {target ? <><div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, minHeight:86 }}>
      {Array.from({length:target.size},(_,i)=>suits[i] !== undefined ?
        <PlayingCard key={i} value={target.value} suitIndex={suits[i]}/> :
        <div key={i} title="Enseigne indisponible" aria-label={`Carte ${presidentCardRank(target.value)}, enseigne indisponible`} style={{width:58,height:82,borderRadius:8,background:"#f7f0df",border:"1px solid #c9b99e",color:"#172321",display:"grid",placeItems:"center",fontFamily:"Georgia,serif",fontSize:29,fontWeight:900}}>{presidentCardRank(target.value)}</div>)}</div>
      <div style={{fontSize:11,color:"#ffe29b",fontWeight:900}}>{target.size===1?"Une carte":target.size===2?"Une paire":"Un brelan"} de {presidentCardRank(target.value)} · {presidentTargetLabel(target)}</div></> : <div style={{padding:13,color:"#e1f4dc",fontWeight:1000,textAlign:"center"}}>TABLE LIBRE<br/><span style={{fontSize:11,fontWeight:500}}>Tu peux ouvrir avec une carte, une paire ou un brelan.</span></div>}
  </div>;
}
/** Recent successful plays are the visible cards of this trick, not imagined opponent hands. */
function TrickCardTimeline({ events, activePlayerId, profilesById, primary, onOpen, showChaosJokers }: any) {
  const plays = [...events].filter((ev:any) => ev.success && ev.target).reverse().slice(-4);
  if (!plays.length) return null;
  return <section aria-label="Cartes posées pendant ce pli" style={{marginTop:8,padding:"9px 8px",borderRadius:13,background:"rgba(4,24,22,.66)",border:"1px solid rgba(139,218,181,.25)"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,marginBottom:7}}>
      <b style={{fontSize:10,color:"#bcefd8",letterSpacing:.5}}>CARTES POSÉES · CE PLI</b>
      <button type="button" onClick={onOpen} style={{border:0,background:"transparent",color:primary,fontSize:10,fontWeight:900,cursor:"pointer"}}>TOUT VOIR ›</button>
    </div>
    <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:4,scrollbarWidth:"thin"}}>
      {plays.map((ev:any,i:number)=>{
        const latest = i === plays.length - 1;
        return <div key={ev.id} style={{flex:"0 0 auto",minWidth:105,maxWidth:175,padding:7,borderRadius:11,border:`1px solid ${latest ? "#e9c56c99" : "rgba(255,255,255,.14)"}`,background:latest?"rgba(233,197,108,.11)":"rgba(255,255,255,.035)"}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
            <ProfileAvatar profile={profilesById.get(ev.playerId)} size={22}/>
            <div style={{minWidth:0}}><div style={{fontSize:9,fontWeight:1000,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{playerName(profilesById.get(ev.playerId))}</div><div style={{fontSize:8,color:latest?"#f5d78b":"#a9c0b7"}}>{latest?"À BATTRE":ev.playerId===activePlayerId?"TON COUP":"COUP PRÉCÉDENT"}</div></div>
          </div>
          <div style={{display:"flex",gap:3,justifyContent:"center"}}>
            {Array.from({length:ev.target.size},(_:unknown,j:number)=> ev.playedSuits?.[j] !== undefined ?
              <PlayingCard key={j} value={ev.target.value} suitIndex={ev.playedSuits[j]} mini/> :
              <div key={j} title="Enseigne non enregistrée" style={{width:43,height:61,borderRadius:6,background:"#f6eedf",color:"#1b2d24",display:"grid",placeItems:"center",fontSize:20,fontFamily:"Georgia,serif",fontWeight:900}}>{presidentCardRank(ev.target.value)}</div>)}
          </div>
                     {showChaosJokers && ev.target.size === 1 && (ev.darts || []).some((dart: any) => dart.bed === "OB") ?
             <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginTop:5}}><PresidentJokerCard mini variant={ev.playerId === activePlayerId ? "hawaii-501" : "king-of-bling"}/><span style={{fontSize:8,color:primary,fontWeight:900}}>BULL · JOKER</span></div> : null}
<div style={{marginTop:5,fontSize:9,fontWeight:950,textAlign:"center",color:latest?"#ffe49b":"#b8c7d0"}}>{presidentTargetLabel(ev.target)}</div>
        </div>;
      })}
    </div>
    <div style={{fontSize:9,color:"#a1bcb1",marginTop:3}}>Le dernier coup est celui à battre. Les cartes précédentes restent visibles jusqu’au prochain pli.</div>
  </section>;
}

/** The complete turn order stays visible; cards in other hands remain hidden. */
function TurnOrderStrip({ state, profilesById, primary, onOpen }: any) {
  const activeIndex = state.order.indexOf(state.activePlayerId);
  const ordered = activeIndex < 0 ? state.order : [...state.order.slice(activeIndex), ...state.order.slice(0, activeIndex)];
  return <section aria-label="Ordre de passage des joueurs" style={{marginTop:9,display:"grid",gap:6}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
      <strong style={{fontSize:10,color:"#dce9e4",letterSpacing:.6}}>ORDRE DE PASSAGE</strong>
      <button type="button" onClick={onOpen} style={{background:"rgba(67,216,255,.09)",border:"1px solid rgba(67,216,255,.35)",borderRadius:99,color:"#9ce9ff",padding:"4px 9px",fontWeight:900,fontSize:9}}>DÉTAIL DU PLI</button>
    </div>
    <div style={{display:"flex",gap:7,overflowX:"auto",padding:"2px 1px 8px",scrollbarWidth:"thin"}}>
      {ordered.map((id:string) => {
        const active = id === state.activePlayerId;
        const done = state.finishedPlayerIds.includes(id);
        const passed = state.passedPlayerIds.includes(id);
        const last = state.lastSuccessfulPlayerId === id && !!state.currentTarget;
        const count = state.hands[id]?.length ?? 0;
        const status = done ? "TERMINÉ" : passed ? "A PASSÉ" : active ? "À TOI DE JOUER" : last ? "DERNIER COUP" : "EN ATTENTE";
        const color = done ? "#7defad" : passed ? "#ffaf87" : active ? primary : last ? "#ffe29b" : "#a9b9cc";
        return <div key={id} aria-current={active ? "step" : undefined} style={{flex:"0 0 124px",borderRadius:12,padding:"7px 8px",border:`1px solid ${active ? primary : last ? "#ffe29b66" : "rgba(255,255,255,.11)"}`,background:active?`${primary}20`:"rgba(255,255,255,.035)",opacity:done?.65:1,boxShadow:active?`0 0 0 1px ${primary}44 inset`:"none"}}>
          <div style={{display:"flex",gap:6,alignItems:"center"}}><ProfileAvatar profile={profilesById.get(id)} size={29}/><div style={{minWidth:0}}><div style={{fontWeight:1000,fontSize:10,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{playerName(profilesById.get(id))}</div><div style={{fontSize:9,fontWeight:900,color:"#f7dca3"}}>{count} carte{count!==1?"s":""}</div></div></div>
          <div style={{fontSize:8,fontWeight:1000,letterSpacing:.2,color,marginTop:6}}>{status}</div>
        </div>;
      })}
    </div>
  </section>;
}

function PlaySuggestions({ targets, selected, current, revolution, onSelect, primary }: {
  targets: PresidentTarget[]; selected: PresidentTarget | null; current: PresidentTarget | null;
  revolution: boolean; onSelect: (target:PresidentTarget)=>void; primary: string;
}) {
  const label = (size:number) => size === 1 ? "SIMPLE" : size === 2 ? "PAIRE" : "BRELAN";
  const sorted = targets.slice().sort((a,b)=>a.size-b.size || (a.value===2?15:a.value)-(b.value===2?15:b.value));
  return <div aria-label="Guide des coups possibles" style={{padding:9,borderRadius:12,border:"1px solid rgba(119,236,191,.32)",background:"rgba(8,45,37,.65)",display:"grid",gap:7,marginBottom:8}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      <b style={{fontSize:11,color:"#9df5d1"}}>♛ COUPS POSSIBLES · {targets.length}</b>
      <span style={{fontSize:10,color:"#efdeb2"}}>{current ? `Battre ${label(current.size)} ${presidentCardRank(current.value)}${revolution ? " · RÉVOLUTION" : ""}` : "OUVERTURE LIBRE"}</span>
    </div>
    {sorted.length ? <div style={{display:"flex",gap:5,flexWrap:"wrap",maxHeight:100,overflowY:"auto"}}>
      {sorted.map(t=>{const active = selected?.value === t.value && selected?.size === t.size;
        return <button key={`${t.value}-${t.size}`} type="button" aria-pressed={active}
          aria-label={`Jouer ${label(t.size).toLowerCase()} de ${presidentCardRank(t.value)} en visant ${presidentTargetLabel(t)}`}
          onClick={()=>onSelect(t)} style={{borderRadius:9,padding:"7px 9px",minHeight:38,border:`1px solid ${active ? primary : "rgba(255,255,255,.18)"}`,background:active?`${primary}30`:"rgba(255,255,255,.055)",color:active?"#fff":"#d6edf1",fontWeight:900,fontSize:10,cursor:"pointer"}}>
            <span style={{color:active?primary:"#f5d68a"}}>{presidentTargetLabel(t)}</span> · {label(t.size)} {presidentCardRank(t.value)}
          </button>})}
      </div> : <div role="status" style={{fontSize:11,color:"#ffb68b",lineHeight:1.5}}>Aucune combinaison ne bat le pli : utilise <b>PASSER</b>. Le joueur qui a posé le dernier coup remportera le pli après les autres passages.</div>}
    {selected && <div style={{fontSize:10,color:"#c8eadc"}}>Ton choix : <b style={{color:primary}}>{label(selected.size)} {presidentCardRank(selected.value)}</b> — vise <b>{presidentTargetLabel(selected)}</b> sur la cible. {current?"Tu dois battre le dernier coup.":"Tu ouvres le pli."}</div>}
  </div>;
}

function LiveHand({ hand, suits = [], targets, selected, onSelect, primary }: any) {
  // Every card is a physical card with its own suit; only the selected rank is
  // aggregated when deciding whether to play a single, pair or three-of-a-kind.
  const cards = (hand as number[]).map((value: number, index: number) => ({
    value, index, suit: suits[index] ?? 0,
  })).sort((a, b) => {
    const strength = (v: number) => v === 2 ? 15 : v;
    return strength(a.value) - strength(b.value) || a.suit - b.suit;
  });
  const counts = new Map<number, number>();
  cards.forEach(({ value }) => counts.set(value, (counts.get(value) || 0) + 1));
  const legalFor = (value: number) => (targets as PresidentTarget[]).filter(t => t.value === value);
  const choice = selected && legalFor(selected.value).some(t => t.size === selected.size) ? selected : null;
  return <div style={{display:"grid",gap:8}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
      <span style={{fontSize:10,color:"#e9d8a6",fontWeight:900}}>CHOISIS UNE CARTE PUIS TA COMBINAISON</span>
      <span style={{fontSize:10,color:"#a9c9b3"}}>{cards.length} cartes réelles · {counts.size} valeurs</span>
    </div>
    <div role="group" aria-label="Cartes de la main" style={{display:"flex",gap:2,overflowX:"auto",padding:"9px 3px 14px",scrollbarWidth:"thin",minHeight:82,alignItems:"flex-start"}}>
      {cards.map(({value,suit,index})=>{
        const options = legalFor(value);
        const active = choice?.value === value;
        return <button key={index} type="button" disabled={!options.length}
          aria-label={`${presidentCardRank(value)} ${cardSuit(value,suit)}${active?", valeur sélectionnée":""}${!options.length?", non jouable":""}`}
          aria-pressed={!!active}
          onClick={() => onSelect(options.find(t => t.size === choice?.size) || options[0])}
          title={options.length ? `${presidentCardRank(value)} ${cardSuit(value,suit)} — ${options.map(t => t.size === 1 ? "simple" : t.size === 2 ? "paire" : "brelan").join(", ")}` : "Ne peut pas battre le pli actuel"}
          style={{border:active?`2px solid ${primary}`:"2px solid transparent",borderRadius:8,padding:2,background:active?`${primary}32`:"transparent",transform:active?"translateY(-7px)":"none",opacity:options.length?1:.38,flex:"0 0 auto",cursor:options.length?"pointer":"not-allowed",transition:"transform .12s ease"}}>
          <PlayingCard value={value} suitIndex={suit} mini/>
        </button>;
      })}
    </div>
    {choice ? <div style={{background:"rgba(255,255,255,.045)",borderRadius:11,padding:8,border:`1px solid ${primary}55`,display:"grid",gap:7}}>
      <div style={{fontSize:11,fontWeight:1000,color:primary}}>VALEUR {presidentCardRank(choice.value)} · {counts.get(choice.value) || 0} carte(s) en main</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:6}}>
        {([1,2,3] as const).map(size=>{
          const valid = legalFor(choice.value).some(t => t.size === size);
          const chosen = choice.size === size;
          return <button key={size} type="button" disabled={!valid} aria-pressed={chosen}
            onClick={()=>onSelect({value:choice.value,size})}
            style={{minHeight:42,borderRadius:9,border:`1px solid ${chosen?primary:"rgba(255,255,255,.16)"}`,background:chosen?`${primary}29`:"rgba(255,255,255,.035)",color:!valid?"#687080":chosen?primary:"#fff",fontWeight:1000,fontSize:11,cursor:valid?"pointer":"not-allowed"}}>
            {size===1?"1 · SIMPLE":size===2?"2 · PAIRE":"3 · BRELAN"}
          </button>;
        })}
      </div>
      <RealComboPreview value={choice.value} size={choice.size} hand={hand} suits={suits} primary={primary}/>
      <div style={{fontSize:10,color:"#e3ebef"}}>Vise <b style={{color:"#8be9ff"}}>{choice.size===1?"SIMPLE":choice.size===2?"DOUBLE":"TRIPLE"} {choice.value}</b> pour poser {choice.size} carte{choice.size>1?"s":""}. Un impact réussi suffit.</div>
    </div> : <div style={{padding:"7px 9px",borderRadius:9,background:"rgba(255,255,255,.04)",color:targets.length?"#e2e6e9":"#ffb38e",fontSize:11,fontWeight:900}}>
      {targets.length ? "Sélectionne une carte éclairée. Les cartes grisées ne battent pas le pli." : "Aucun coup légal : appuie sur PASSER pour continuer."}
    </div>}
  </div>;
}

/** Hide the next human hand until that player explicitly takes the device. */
function PlayerHandoffOverlay({ profile, cards, roundNo, trickNo, primary, onReveal }: any) {
  return <div role="dialog" aria-modal="true" aria-label="Passage au joueur suivant" style={{position:"fixed",inset:0,zIndex:10010,background:"linear-gradient(155deg,#050a12 0%,#10292b 54%,#080b15 100%)",display:"grid",placeItems:"center",padding:16,color:"#fff"}}>
    <div style={{width:"min(410px,100%)",padding:"25px 18px",borderRadius:23,border:`1px solid ${primary}77`,background:"linear-gradient(180deg,rgba(255,255,255,.075),rgba(0,0,0,.38))",boxShadow:"0 24px 75px rgba(0,0,0,.65)",textAlign:"center",display:"grid",gap:14,justifyItems:"center"}}>
      <div style={{fontSize:11,letterSpacing:2,fontWeight:1000,color:primary}}>♛ PRÉSIDENT · PASSAGE DE RELAIS</div>
      <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center",flexWrap:"wrap",fontSize:10,color:"#b7c9d1"}}><span>MANCHE {roundNo}</span><span>•</span><span>PLI {trickNo}</span></div>
      <div style={{padding:6,borderRadius:"50%",border:`2px solid ${primary}88`,boxShadow:`0 0 28px ${primary}33`}}><ProfileAvatar profile={profile} size={92}/></div>
      <div style={{fontSize:12,color:"#c3d0d7",fontWeight:900}}>AU TOUR DE</div>
      <div style={{fontSize:24,fontWeight:1100,color:primary,overflowWrap:"anywhere"}}>{playerName(profile)}</div>
      <div style={{padding:"10px 15px",borderRadius:14,background:"rgba(255,255,255,.055)",border:"1px solid rgba(255,255,255,.09)",fontSize:12,lineHeight:1.5}}><b>{cards} cartes</b> dans ta main. Elles restent cachées jusqu'à ce que tu prennes le relais.</div>
      <div aria-hidden="true" style={{display:"flex",gap:5,margin:"3px 0"}}>{[0,1,2,3].map(i=><div key={i} style={{width:37,height:53,borderRadius:7,background:"repeating-linear-gradient(45deg,#153d47,#153d47 5px,#215466 5px,#215466 10px)",border:"2px solid #bdc8bd",boxShadow:"0 2px 7px #0009",transform:`rotate(${(i-1.5)*6}deg)`}}/>)}</div>
      <button type="button" autoFocus onClick={onReveal} style={{...action(primary),width:"100%",minHeight:54,fontSize:13,background:`linear-gradient(120deg,${primary}35,${primary}16)`,color:"#fff",border:`1px solid ${primary}`}}>JE SUIS {playerName(profile).toUpperCase()} · VOIR MA MAIN</button>
      <div style={{fontSize:10,color:"#93a6b0",lineHeight:1.45}}>Passe l'appareil au joueur indiqué avant de révéler ses cartes.</div>
    </div>
  </div>;
}

function TaxExchangeOverlay({ state, profilesById, primary, onConfirm }: any) {
  const task = state.pendingTaxes?.[0];
  const [chosen, setChosen] = React.useState<number[]>([]);
  React.useEffect(() => setChosen([]), [task?.highId, task?.lowId, state.roundNo]);
  if (!task) return null;
  const hand = state.hands[task.highId] || [];
  const suits = state.suitsByPlayer[task.highId] || [];
  const lowHand = state.hands[task.lowId] || [];
  const highName = playerName(profilesById.get(task.highId));
  const lowName = playerName(profilesById.get(task.lowId));
  return <div role="dialog" aria-modal="true" aria-label="Échange de cartes" style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.88)",backdropFilter:"blur(8px)",display:"grid",placeItems:"center",padding:12}}>
    <div style={{...panel(),width:"min(730px,100%)",maxHeight:"94vh",overflowY:"auto",borderColor:`${primary}88`}}>
      <div style={{textAlign:"center",color:primary,fontWeight:1100,fontSize:12,letterSpacing:1}}>♛ MANCHE {state.roundNo} · {task.kind==="president"?"TAXE DU PRÉSIDENT":"TAXE DES VICE"}</div>
      <div style={{fontSize:18,fontWeight:1000,textAlign:"center",marginTop:6}}>ÉCHANGE DE CARTES</div>
      <p style={{textAlign:"center",fontSize:12,lineHeight:1.55,color:"#d5dae5"}}><b style={{color:primary}}>{highName}</b> choisit <b>{task.count} carte{task.count>1?"s":""}</b> à remettre à <b>{lowName}</b>. En retour, {lowName} donne automatiquement {task.count===2?"ses 2 meilleures cartes":"sa meilleure carte"}.</p>
      <div style={{...panel(),background:"rgba(13,70,51,.55)",padding:9}}><div style={{fontWeight:1000,fontSize:11,color:"#9deccc",marginBottom:8}}>MAIN DE {highName.toUpperCase()} · SÉLECTIONNER {task.count} CARTE{task.count>1?"S":""}</div>
       <div style={{display:"flex",gap:7,overflowX:"auto",padding:"11px 2px 16px"}}>{hand.map((rank:number,i:number)=>{const active=chosen.includes(i);return <button key={i} type="button" aria-pressed={active} aria-label={`Donner ${presidentCardRank(rank)} ${cardSuit(rank,suits[i])}`} onClick={()=>setChosen(old=>old.includes(i)?old.filter(x=>x!==i):old.length<task.count?[...old,i]:[...old.slice(1),i])} style={{flex:"0 0 auto",background:active?`${primary}38`:"transparent",border:`2px solid ${active?primary:"transparent"}`,borderRadius:9,padding:3,transform:active?"translateY(-7px)":"none",cursor:"pointer"}}><PlayingCard value={rank} suitIndex={suits[i]||0} mini/></button>})}</div>
       <div style={{fontSize:11,color:chosen.length===task.count?"#89efb7":"#ffb98c"}}>{chosen.length}/{task.count} sélectionnée(s) · Touche une carte pour la choisir ou la retirer.</div>
      </div>
      <div style={{marginTop:10,padding:10,borderRadius:12,border:"1px solid rgba(255,255,255,.10)",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><span style={{fontSize:11,fontWeight:950,color:"#f8dd9a"}}>REÇUES DE {lowName.toUpperCase()} :</span>{lowHand.slice(-task.count).map((rank:number,i:number)=><PlayingCard key={i} value={rank} suitIndex={(state.suitsByPlayer[task.lowId]||[])[lowHand.length-task.count+i]||0} mini/>)}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}><button onClick={()=>onConfirm(presidentDefaultTaxIndices(state))} style={action("#a5b5d2")}>ÉCHANGE AUTO</button><button disabled={chosen.length!==task.count} onClick={()=>onConfirm(chosen)} style={action(primary,chosen.length!==task.count)}>VALIDER L'ÉCHANGE</button></div>
    </div>
  </div>;
}

/** Archive des coups regroupés par pli, avec les enseignes des cartes réellement jouées. */
function PresidentTrickArchive({ state, profilesById, primary }: any) {
  const groups = React.useMemo(() => {
    const byTrick = new Map<string, any>();
    for (const ev of state.history || []) {
      const key = `${ev.roundNo}:${ev.trickNo}`;
      if (!byTrick.has(key)) byTrick.set(key, { key, roundNo: ev.roundNo, trickNo: ev.trickNo, events: [] });
      byTrick.get(key).events.push(ev);
    }
    return [...byTrick.values()].reverse();
  }, [state.history]);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  if (!groups.length) return <div style={{opacity:.65,fontSize:11,padding:12}}>Les premiers plis apparaîtront ici dès qu'une carte aura été jouée.</div>;
  return <div style={{display:"grid",gap:8}}>{groups.map((group:any) => {
    const isCurrent = group.roundNo === state.roundNo && group.trickNo === state.trickNo && !state.finished;
    const valid = group.events.filter((ev:any) => ev.success && ev.target);
    const winner = valid.length ? valid[valid.length-1].playerId : null;
    const opened = expanded === group.key || (expanded === null && group === groups[0]);
    return <div key={group.key} style={{border:`1px solid ${isCurrent?primary+"66":"rgba(255,255,255,.12)"}`,borderRadius:13,overflow:"hidden",background:"rgba(255,255,255,.035)"}}>
      <button type="button" aria-expanded={opened} onClick={()=>setExpanded(opened?"":group.key)} style={{width:"100%",border:0,background:"rgba(255,255,255,.035)",color:"#fff",padding:"10px 11px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,textAlign:"left",cursor:"pointer"}}>
        <span style={{fontWeight:1000,fontSize:11}}>MANCHE {group.roundNo} · PLI {group.trickNo} {isCurrent?"· EN COURS":""}</span>
        <span style={{color:isCurrent?"#86e2ff":"#e9c56c",fontSize:10,fontWeight:900}}>{isCurrent?"Table active":winner?`Dernière pose : ${playerName(profilesById.get(winner))}`:"Aucune carte posée"} {opened?"▴":"▾"}</span>
      </button>
      {opened?<div style={{padding:9,display:"grid",gap:7}}>{group.events.map((ev:any) => <div key={ev.id} style={{display:"flex",gap:9,alignItems:"center",borderBottom:"1px solid rgba(255,255,255,.06)",paddingBottom:6}}>
        <ProfileAvatar profile={profilesById.get(ev.playerId)} size={30}/>
        <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:950}}>{playerName(profilesById.get(ev.playerId))}</div><div style={{fontSize:9,color:ev.success?"#83eabc":"#ffae89"}}>{ev.success?`POSE ${ev.target?.size===1?"UNE CARTE":ev.target?.size===2?"UNE PAIRE":"UN BRELAN"}`:ev.automaticPass?"PASSAGE AUTOMATIQUE":ev.passed?"PASSE":"TIR MANQUÉ"}</div></div>
        {ev.success && ev.target ? <div style={{display:"flex",gap:3,flexShrink:0}}>{Array.from({length:ev.target.size},(_:unknown,i:number)=>ev.playedSuits?.[i] !== undefined ? <PlayingCard key={i} value={ev.target.value} suitIndex={ev.playedSuits[i]} mini/> : <div key={i} title="Enseigne non enregistrée dans cette ancienne action" style={{width:43,height:61,borderRadius:6,background:"#eee8d8",color:"#242424",display:"grid",placeItems:"center",fontWeight:900,fontSize:18}}>{presidentCardRank(ev.target.value)}</div>)}</div> : <span style={{fontSize:11,color:"#ffae89",fontWeight:900}}>PASS</span>}
      </div>)}</div>:null}
    </div>;
  })}</div>;
}

function RoundOverlay({ result, state, profilesById, primary, onClose }: any) {
  if (!result) return null;
  const ranks: string[] = result.ranking || [];
  const leader = ranks[0];
  const leaderProfile = profilesById.get(leader);
  return <div role="dialog" aria-modal="true" aria-label={`Fin de manche ${result.roundNo}`} style={{position:"fixed",inset:0,zIndex:9998,display:"grid",placeItems:"center",padding:10,background:"rgba(0,0,0,.82)",backdropFilter:"blur(8px)"}}>
    <div style={{...panel(),width:"min(720px,100%)",maxHeight:"92vh",overflow:"auto",borderColor:`${primary}77`,padding:12}}>
      <div style={{textAlign:"center",padding:"5px 0 10px"}}>
        <div style={{color:primary,fontWeight:1100,fontSize:11,letterSpacing:1.5}}>FIN DE MANCHE {result.roundNo}</div>
        <div style={{fontSize:21,fontWeight:1100,marginTop:4}}>♛ NOUVELLE HIÉRARCHIE</div>
        <div style={{color:"#c5d9d4",fontSize:10,marginTop:4}}>Les rôles suivent l’ordre de sortie. Chaque position rapporte ses points de classement : le dernier reçoit 0 point.</div>
      </div>
      {leader ? <div style={{border:`1px solid ${primary}88`,background:`linear-gradient(145deg,${primary}22,rgba(15,44,38,.94))`,borderRadius:17,padding:13,display:"flex",alignItems:"center",gap:12}}>
        <RoleMedal role="Président" primary={primary}/><ProfileAvatar profile={leaderProfile} size={48}/>
        <div style={{flex:1,minWidth:0}}><div style={{color:primary,fontSize:9,fontWeight:1000,letterSpacing:1}}>PRÉSIDENT DE LA MANCHE</div><div style={{fontSize:18,fontWeight:1100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{playerName(leaderProfile)}</div></div>
        <div style={{fontWeight:1100,color:"#ffe7a1",whiteSpace:"nowrap"}}>+{result.powerPoints?.[leader] ?? 0} pts</div>
      </div> : null}
      <div style={{display:"grid",gap:7,marginTop:10}}>{ranks.slice(1).map((id:string,i:number)=>{
        const role = result.roles?.[id] || "Citoyen"; const profile = profilesById.get(id);
        return <div key={id} style={{display:"grid",gridTemplateColumns:"22px 46px 35px minmax(0,1fr) auto",alignItems:"center",gap:7,padding:"7px 8px",borderRadius:12,background:"rgba(255,255,255,.045)",border:"1px solid rgba(255,255,255,.10)"}}>
          <b style={{color:"#adbab5",fontSize:12}}>{i+2}.</b><RoleMedal role={role} primary={primary}/><ProfileAvatar profile={profile} size={34}/>
          <div style={{minWidth:0}}><div style={{fontWeight:1000,fontSize:12,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{playerName(profile)}</div><div style={{color:roleColor(role,primary),fontSize:10,fontWeight:900}}>{role}</div></div>
          <b style={{color:primary,fontSize:11,whiteSpace:"nowrap"}}>+{result.powerPoints?.[id] ?? 0} pts</b>
        </div>;
      })}</div>
      <div style={{marginTop:10,padding:10,borderRadius:12,border:"1px solid rgba(255,173,119,.42)",background:"rgba(57,29,17,.38)",fontSize:11,lineHeight:1.6}}>
        <b style={{color:"#ffd5a2"}}>POINTS DE CLASSEMENT · MANCHE {result.roundNo}</b>
        <div style={{color:"#c9d8d1",margin:"3px 0 7px"}}>Le premier marque N−1 points (N joueurs), le dernier 0. Aucun kilo de merde au Président.</div>
        {ranks.map((id:string)=><div key={id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,.06)"}}><span>{playerName(profilesById.get(id))} · {(result.remainingCards?.[id]||[]).length} carte(s)</span><b style={{color:"#8ef7bf"}}>+{result.powerPoints?.[id]??0} pts</b></div>)}
      </div>
      <div style={{marginTop:11,padding:10,borderRadius:12,border:`1px solid ${primary}45`,background:`${primary}10`,fontSize:11,lineHeight:1.55}}>
        <b style={{color:primary}}>PROCHAINE MANCHE · ÉCHANGES DE CARTES</b>
        <div style={{marginTop:4}}>Le Trou du cul donne ses 2 meilleures cartes au Président ; celui-ci choisit 2 cartes à lui rendre. À partir de 4 joueurs, le Vice-Trou du cul donne sa meilleure carte au Vice-Président, qui choisit une carte en retour.</div>
        <div style={{fontSize:10,color:"#b7ccc3",marginTop:5}}>Les cartes seront sélectionnées dans l'écran d'échanges avant de jouer.</div>
      </div>
      {state.taxesThisRound?.length ? <div style={{marginTop:10,padding:10,borderRadius:12,background:"rgba(255,255,255,.035)",border:"1px solid rgba(255,255,255,.10)"}}>
        <b style={{color:primary,fontSize:10}}>ÉCHANGES EFFECTUÉS · MANCHE {state.roundNo}</b>
        {state.taxesThisRound.map((tax:any,i:number)=><div key={i} style={{marginTop:8,fontSize:10}}>
          <div><b>{playerName(profilesById.get(tax.fromPlayerId))}</b> → <b>{playerName(profilesById.get(tax.toPlayerId))}</b></div>
          <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap",marginTop:5}}>{tax.given.map((rank:number,j:number)=>tax.givenSuits?.[j] === undefined ? <div key={j} style={{width:43,height:61,display:"grid",placeItems:"center",borderRadius:6,background:"#f3ebdd",color:"#242424",fontWeight:900}}>{presidentCardRank(rank)}</div>:<PlayingCard key={j} value={rank} suitIndex={tax.givenSuits[j]} mini/>)}<span style={{color:primary,fontWeight:900}}>⇄</span>{tax.returned.map((rank:number,j:number)=>tax.returnedSuits?.[j] === undefined ? <div key={j} style={{width:43,height:61,display:"grid",placeItems:"center",borderRadius:6,background:"#f3ebdd",color:"#242424",fontWeight:900}}>{presidentCardRank(rank)}</div>:<PlayingCard key={j} value={rank} suitIndex={tax.returnedSuits[j]} mini/>)}</div>
        </div>)}
      </div> : null}
      <button type="button" onClick={onClose} style={{width:"100%",minHeight:46,borderRadius:12,border:`1px solid ${primary}`,background:`linear-gradient(90deg,#b68b31,${primary},#fff0b2)`,color:"#100d06",fontWeight:1100,marginTop:12}}>CONTINUER VERS LA MANCHE {state.roundNo}</button>
    </div>
  </div>;
}

function EndOverlay({ state, profilesById, primary, onReplay, onHistory, onClose }: any) {
  const standings = getPresidentStandings(state);
  return <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "grid", placeItems: "center", padding: 10, background: "rgba(0,0,0,.82)", backdropFilter: "blur(9px)" }}><div style={{ ...panel(), width: "min(880px,100%)", maxHeight: "94vh", overflow: "auto", borderColor: `${primary}88` }}>
    <div style={{ display: "grid", gridTemplateColumns: "34px 1fr 34px", alignItems: "center" }}><div /><div style={{ textAlign: "center" }}><div style={{ color: primary, fontWeight: 1100, letterSpacing: 1.2 }}>FIN DU RÈGNE</div><div style={{ fontSize: 23, fontWeight: 1100 }}>♛ PRÉSIDENT SUPRÊME</div></div><button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 18 }}>×</button></div>
    <div style={{ marginTop: 12, padding: 14, borderRadius: 16, textAlign: "center", background: `${primary}10`, border: `1px solid ${primary}48` }}><ProfileAvatar profile={profilesById.get(state.winnerId)} size={70} /><div style={{ marginTop: 7, fontSize: 24, fontWeight: 1100 }}>{playerName(profilesById.get(state.winnerId))}</div><div style={{ color: primary, fontSize: 34, fontWeight: 1100 }}>{standings[0]?.powerPoints || 0} points</div></div>
    <div style={{ display: "grid", gap: 7, marginTop: 11 }}>{standings.map((row: any, i: number) => { const s = state.statsByPlayer[row.id]; return <div key={row.id} style={{ display: "grid", gridTemplateColumns: "30px 40px minmax(0,1fr) repeat(3,auto)", gap: 8, alignItems: "center", padding: 9, borderRadius: 14, background: "rgba(255,255,255,.04)", border: `1px solid ${i===0?primary+"66":"rgba(255,255,255,.08)"}` }}><div style={{ fontWeight: 1100, color: i===0?"#ffd76a":"#fff" }}>{i+1}.</div><ProfileAvatar profile={profilesById.get(row.id)} size={36} /><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000 }}>{row.name}</div><div style={{ fontSize: 9.5, color: "rgba(255,255,255,.58)" }}>rang moy. {row.avgRank ? row.avgRank.toFixed(2) : "—"} · réussite {formatPct(s.successfulPlays,s.visits)}%</div></div><div style={{ textAlign: "center" }}><div style={{ color: primary, fontWeight: 1100 }}>{row.powerPoints}</div><div style={{ fontSize: 8.5, opacity: .6 }}>PTS</div></div><div style={{ textAlign: "center" }}><div style={{ color: "#ffd76a", fontWeight: 1100 }}>{s.president}</div><div style={{ fontSize: 8.5, opacity: .6 }}>PRÉS.</div></div><div style={{ textAlign: "center" }}><div style={{ color: "#ff8b9e", fontWeight: 1100 }}>{s.trouDuCul}</div><div style={{ fontSize: 8.5, opacity: .6 }}>TDC</div></div></div>; })}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7, marginTop: 11 }}>{[["Durée",fmtTime((state.finishedAt||Date.now())-state.startedAt)],["Manches",state.roundResults.length],["Plis",Object.values(state.statsByPlayer).reduce((a:any,s:any)=>a+s.tricksWon,0)],["Coups d’État",Object.values(state.statsByPlayer).reduce((a:any,s:any)=>a+s.coupEtats,0)]].map(([l,v]:any)=><div key={l} style={{ padding: 9, borderRadius: 13, background: "rgba(255,255,255,.04)", textAlign: "center" }}><div style={{ fontSize: 8.5, opacity: .6 }}>{l}</div><div style={{ color: primary, fontWeight: 1100, fontSize: 18 }}>{v}</div></div>)}</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginTop: 12 }}><button onClick={onReplay} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `${primary}14`, color: primary, fontWeight: 1100 }}>REJOUER</button><button onClick={onHistory} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `linear-gradient(90deg,#b68b31,${primary},#fff0b2)`, color: "#100d06", fontWeight: 1100 }}>HISTORIQUE & STATS</button></div>
  </div></div>;
}


function KpiIcon({ name, size = 18 }: {
    name: KpiIconName;
    size?: number;
}) {
    const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
    const svg = (children: React.ReactNode) => <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;
    switch (name) {
        case "cards": return svg(<><rect {...p} x="6" y="4" width="12" height="16" rx="2"/><path {...p} d="M4 7v10a2 2 0 0 0 2 2"/><path {...p} d="m10 9 2-2 2 2-2 2-2-2Z"/></>);
        case "tricks": return svg(<><circle {...p} cx="12" cy="12" r="7"/><circle {...p} cx="12" cy="12" r="2.5"/><path {...p} d="M16.5 7.5 20 4"/><path {...p} d="M17 4h3v3"/></>);
        case "success": return svg(<><circle {...p} cx="12" cy="12" r="8"/><path {...p} d="m8.2 12.2 2.4 2.4 5.4-5.6"/></>);
        case "power": return svg(<><path {...p} d="m4 9 4 3 4-6 4 6 4-3-2 9H6L4 9Z"/><path {...p} d="M7 18h10"/></>);
        case "darts": return svg(<><path {...p} d="M4 20 17 7"/><path {...p} d="m14 6 4-2 2 2-2 4"/><path {...p} d="m8 16 3 3"/></>);
        case "single": return svg(<rect {...p} x="7" y="4" width="10" height="16" rx="2"/>);
        case "pair": return svg(<><rect {...p} x="5" y="5" width="10" height="15" rx="2"/><rect {...p} x="9" y="4" width="10" height="15" rx="2"/></>);
        case "triple": return svg(<><rect {...p} x="3" y="6" width="9" height="14" rx="2"/><rect {...p} x="8" y="5" width="9" height="14" rx="2"/><rect {...p} x="12" y="4" width="9" height="14" rx="2"/></>);
        case "pass": return svg(<><path {...p} d="M4 7h9a5 5 0 0 1 5 5v5"/><path {...p} d="m14 14 4 4 4-4"/></>);
        case "taxes": return svg(<><path {...p} d="M5 8h13"/><path {...p} d="m15 5 3 3-3 3"/><path {...p} d="M19 16H6"/><path {...p} d="m9 13-3 3 3 3"/></>);
        case "miss": return svg(<><circle {...p} cx="12" cy="12" r="8"/><path {...p} d="m8.5 8.5 7 7"/><path {...p} d="m15.5 8.5-7 7"/></>);
        default: return null;
    }
}

function MiniKpi({ label, value, color, compact = false, icon }: {
    label: string;
    value: React.ReactNode;
    color: string;
    compact?: boolean;
    icon?: KpiIconName;
}) {
    return <div title={label} aria-label={`${label} : ${String(value)}`} style={{ minWidth: 0, padding: compact ? "5px 3px" : "7px 5px", borderRadius: compact ? 10 : 13, border: `1px solid ${color}38`, background: `linear-gradient(180deg,${color}14,rgba(255,255,255,.025))`, textAlign: "center", overflow: "hidden" }}>
    {icon ? <div style={{ color, display: "grid", placeItems: "center", height: compact ? 15 : 19 }}><KpiIcon name={icon} size={compact ? 13 : 17}/></div> : <div style={{ color: "rgba(255,255,255,.52)", fontSize: compact ? 7.5 : 8.5, fontWeight: 1000, letterSpacing: .35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>}
    <div style={{ color, fontSize: compact ? 14 : 20, fontWeight: 1100, lineHeight: 1.05, marginTop: icon ? (compact ? 2 : 3) : (compact ? 2 : 4), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
  </div>;
}

function QuickTile({ label, value, color, icon, onClick, alert = false }: any) {
  return <button type="button" onClick={onClick} style={{ minWidth:0, minHeight:61, borderRadius:15, padding:"8px 7px", border:`1px solid ${alert ? color : color+"55"}`, background:`linear-gradient(180deg,${color}${alert?"28":"16"},rgba(255,255,255,.025))`, color:"#fff", cursor:"pointer", boxShadow:alert?`0 0 18px ${color}32`:"none", textAlign:"left", overflow:"hidden" }}>
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:5 }}><span style={{ color, fontSize:15, lineHeight:1 }}>{icon}</span><span style={{ color, fontSize:8, fontWeight:1100, letterSpacing:.7 }}>OUVRIR</span></div>
    <div style={{ marginTop:5, fontSize:10, fontWeight:1100, letterSpacing:.55, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{label}</div>
    <div style={{ color:"rgba(255,255,255,.58)", fontSize:8.5, marginTop:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{value}</div>
  </button>;
}

function ModalShell({ title, color, onClose, children, wide = false }: any) {
  return <div role="dialog" aria-modal="true" onClick={onClose} style={{ position:"fixed", inset:0, zIndex:9997, background:"rgba(0,0,0,.72)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", display:"grid", placeItems:"center", padding:10 }}>
    <div onClick={(e)=>e.stopPropagation()} style={{ ...panel(), width:wide?"min(860px,100%)":"min(720px,100%)", maxHeight:"88vh", overflow:"hidden", borderColor:`${color}66`, boxShadow:`0 0 34px ${color}1d` }}>
      <div style={{ display:"grid", gridTemplateColumns:"34px 1fr 34px", alignItems:"center", gap:8, paddingBottom:9, borderBottom:"1px solid rgba(255,255,255,.08)" }}><div/><div style={{ textAlign:"center", color, fontWeight:1100, fontSize:12, letterSpacing:1 }}>{title}</div><button type="button" onClick={onClose} style={{ width:32,height:32,borderRadius:999,border:`1px solid ${color}66`,background:"rgba(0,0,0,.3)",color,fontWeight:1100,cursor:"pointer" }}>×</button></div>
      <div style={{ maxHeight:"calc(88vh - 54px)", overflowY:"auto", paddingTop:10 }}>{children}</div>
    </div>
  </div>;
}

function TinyTarget({ selected, tableTarget, revolution, primary, onClick }: any) {
    const label = selected ? presidentTargetLabel(selected) : "—";
    const desc = selected ? presidentTargetDescription(selected) : "CHOISIR";
    return <button type="button" onClick={onClick} style={{ position: "relative", width: "100%", height: "100%", minHeight: 102, borderRadius: 17, border: `1px solid ${primary}66`, background: "radial-gradient(circle at 50% 45%,rgba(233,197,108,.16),transparent 50%),linear-gradient(160deg,#171008,#07090f)", color: "#fff", cursor: "pointer", overflow: "hidden", padding: "7px 5px", isolation: "isolate" }}>
    <ComboCardFan target={selected} compact/>
    <div style={{ position: "relative", zIndex: 2, color: "rgba(255,255,255,.55)", fontSize: 7.5, fontWeight: 1000, letterSpacing: .7 }}>{tableTarget ? "CIBLE À BATTRE" : "OUVERTURE"}</div>
    <div style={{ position: "relative", zIndex: 2, color: primary, fontSize: 36, fontWeight: 1100, lineHeight: 1, marginTop: 7, textShadow: `0 0 18px ${primary}55` }}>{label}</div>
    <div style={{ position: "relative", zIndex: 2, color: "#f7e5b4", fontSize: 8.5, fontWeight: 1000, marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{desc}</div>
    {revolution ? <div style={{ position: "relative", zIndex: 2, color: "#ff9b6a", fontSize: 7.5, fontWeight: 1100, marginTop: 4 }}>↕ RÉVOLUTION</div> : null}
    <div style={{ position: "absolute", zIndex: 2, right: 6, bottom: 4, color: `${primary}aa`, fontSize: 8, fontWeight: 1000 }}>TOUCHER</div>
  </button>;
}

function PresidentStandardPlay(props: any) {
  const { theme } = useTheme();
  const config = React.useMemo(() => normalizeConfig(props), []);
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const store = props?.store ?? props?.params?.store ?? null;
  const onFinish = props?.onFinish as ((record: any, options?: { navigate?: boolean }) => void) | undefined;
  const primary = theme?.primary || GOLD;
  const text = theme?.text || "#f7f8fb";
  const softText = theme?.textSoft || "#aeb2d3";
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);

  const allProfiles = React.useMemo(() => {
    const map = new Map<string, any>();
    (Array.isArray(store?.profiles) ? store.profiles : []).forEach((p: any) => map.set(String(p.id), p));
    (config.playersList || []).forEach((p: any) => map.set(String(p.id), { ...(map.get(String(p.id)) || {}), ...p }));
    return [...map.values()];
  }, [store, config.playersList]);
  const profilesById = React.useMemo(() => new Map(allProfiles.map((p: any) => [String(p.id), p])), [allProfiles]);
  const players = React.useMemo(() => config.selectedIds.map((id) => { const p = profilesById.get(String(id)); return { id: String(id), name: playerName(p) }; }), [config.selectedIds, profilesById]);

  const createInitial = React.useCallback(() => createPresidentState(players as any, {
    rounds: config.rounds, handSize: config.handSize, deckCopies: config.deckCopies, variant: config.variant,
    bullJoker: config.bullJoker, coupEtat: config.coupEtat, revolution: config.revolution,
  }, config.selectedIds), [players, config]);

  const [state, setState] = React.useState<PresidentState>(() => createInitial());
  const [selectedTarget, setSelectedTarget] = React.useState<PresidentTarget | null>(null);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1|2|3>(1);
  const [notice, setNotice] = React.useState("");
  const [undo, setUndo] = React.useState<PresidentState[]>([]);
  const [botThinking, setBotThinking] = React.useState(false);
  const inputSectionRef = React.useRef<HTMLElement | null>(null);
  const handSectionRef = React.useRef<HTMLElement | null>(null);
  const [showHelp, setShowHelp] = React.useState(false);
  const [showRound, setShowRound] = React.useState(false);
  const [showEnd, setShowEnd] = React.useState(false);
  const [showTable, setShowTable] = React.useState(false);
  const [showHand, setShowHand] = React.useState(false);
  const [showInput, setShowInput] = React.useState(false);
  const [showStats, setShowStats] = React.useState(false);
  const [showTrick, setShowTrick] = React.useState(false);
  const [showArchive, setShowArchive] = React.useState(false);
  const [showObjective, setShowObjective] = React.useState(false);
  const [adviceTab, setAdviceTab] = React.useState<"conseil"|"strategie"|"viser"|"regles">("conseil");
  const [revealedTurnKey, setRevealedTurnKey] = React.useState<string | null>(null);
  const [trickTransition, setTrickTransition] = React.useState<any>(null);
  const previousTrickRef = React.useRef({round:state.roundNo,trick:state.trickNo,winnerId:state.lastSuccessfulPlayerId,target:state.currentTarget,history:state.history});
  React.useEffect(() => {
    const prev = previousTrickRef.current;
    if (state.roundNo === prev.round && state.trickNo === prev.trick + 1 && prev.winnerId && prev.target) {
      const events = (prev.history || []).filter((event:any)=>event.roundNo===prev.round && event.trickNo===prev.trick);
      setTrickTransition({roundNo:prev.round,trickNo:prev.trick,nextTrick:state.trickNo,winnerId:prev.winnerId,events});
      setShowInput(false);
    } else if (state.roundNo !== prev.round || state.trickNo < prev.trick) {
      setTrickTransition(null);
    }
    previousTrickRef.current = {round:state.roundNo,trick:state.trickNo,winnerId:state.lastSuccessfulPlayerId,target:state.currentTarget,history:state.history};
  }, [state.roundNo,state.trickNo,state.lastSuccessfulPlayerId,state.currentTarget,state.history]);

  const matchIdRef = React.useRef(`president-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
  const savedRef = React.useRef("");
  const roundCountRef = React.useRef(0);

  const activeId = state.activePlayerId;
  const activeProfile = profilesById.get(activeId) || state.players.find((p) => p.id === activeId);
  const hand = state.hands[activeId] || [];
  const legalTargets = React.useMemo(() => presidentLegalTargets(hand, state.currentTarget, state.revolutionActive), [hand, state.currentTarget, state.revolutionActive]);
  const activeCanPlay = legalTargets.length > 0;
  // Historical feedback is derived from committed events rather than a guessed hit.
  // This remains correct after undo, bot turns, and a change of player.
  const latestPlayedTurn = [...state.history].reverse().find((ev) => ev.darts.length > 0) || null;
  const latestTurnFeedback = latestPlayedTurn && latestPlayedTurn.roundNo === state.roundNo
    ? latestPlayedTurn : null;
  const matchingDarts = selectedTarget ? throwDarts.map((d) => dartMatchesUi(config, selectedTarget, d)) : [];

  const currentRole = state.previousRoles[activeId] || (state.roundNo === 1 ? "Citoyen" : "Citoyen");
  const latestRound = state.roundResults[state.roundResults.length - 1] || null;
  // A new confirmed turn always requires a new handoff, including after undo.
  // Bots never need an approval screen. Taxes and end-of-round dialogs have priority.
  const turnKey = `${state.roundNo}:${state.trickNo}:${state.history.length}:${activeId}`;
  React.useEffect(() => { setShowInput(false); }, [turnKey]);
  const activeIsBot = isBotProfile(activeProfile, botIds);
  const needsHandoff = !activeIsBot && !state.finished && !showRound && !showEnd &&
    !(state.pendingTaxes?.length) && revealedTurnKey !== turnKey;

  const teamConfigs = React.useMemo(
    () => Array.isArray((config as any).teamConfigs) ? (config as any).teamConfigs : [],
    [config],
  );
  const activeTeam = React.useMemo(
    () => teamConfigs.find((team: any) => Array.isArray(team?.playerIds) && team.playerIds.map(String).includes(String(activeId))) || null,
    [teamConfigs, activeId],
  );
  const activeTeamLogo = activeTeam?.logoDataUrl || activeTeam?.logoUrl || activeTeam?.logo || null;

  React.useEffect(() => {
    const first = presidentAutoTarget(state, activeId);
    setSelectedTarget(first);
    setThrowDarts([]); setMultiplier(1); setNotice("");
  }, [activeId, state.trickNo, state.roundNo, state.currentTarget?.value, state.currentTarget?.size, state.revolutionActive]);

  React.useEffect(() => {
    if (state.roundResults.length > roundCountRef.current) {
      roundCountRef.current = state.roundResults.length;
      if (!state.finished) setShowRound(true);
    }
    if (state.finished) setShowEnd(true);
  }, [state.roundResults.length, state.finished]);

  function commitAttempt(darts: UiDart[], target = selectedTarget) {
    if (!target || state.finished || botThinking || needsHandoff || trickTransition) return;
    setUndo((u) => [...u.slice(-49), clonePresidentState(state)]);
    setState((prev) => playPresidentTurn(prev, target, darts.map(toGameDart)));
    setThrowDarts([]); setMultiplier(1); setNotice("");
  }
  function addDart(value: number, direct?: 1|2|3) {
    if (!selectedTarget || state.finished || botThinking || needsHandoff || trickTransition || throwDarts.length >= 3) return;
    const mult = direct || multiplier;
    const d: UiDart = value === 25 ? { v:25, mult: mult === 2 ? 2 : 1 } : { v: Math.max(0,Math.min(20,Number(value)||0)), mult };
    const next = [...throwDarts,d]; setThrowDarts(next); if (mult>1) setMultiplier(1);
    if (dartMatchesUi(config, selectedTarget, d)) { commitAttempt(next, selectedTarget); return; }
    if (next.length >= 3) { commitAttempt(next, selectedTarget); }
  }
  function validateAttempt() { if (!selectedTarget) return; if (!throwDarts.length) { setNotice("Joue au moins une fléchette ou utilise PASSER."); return; } commitAttempt(throwDarts); }
  function passTurn() {
    if (!state.currentTarget || state.finished || botThinking || needsHandoff || trickTransition) return;
    setUndo((u) => [...u.slice(-49), clonePresidentState(state)]);
    setState((prev) => passPresidentTurn(prev, false));
    setThrowDarts([]); setMultiplier(1); setNotice("PASSÉ");
  }
  function undoTurn() {
    if (throwDarts.length) { setThrowDarts([]); setMultiplier(1); setNotice(""); return; }
    if (!undo.length || state.finished) return;
    const prev = undo[undo.length-1]; setUndo((u)=>u.slice(0,-1)); setState(clonePresidentState(prev)); setNotice("Dernier tour annulé.");
  }
  function back() {
    if (state.history.length && !state.finished && !window.confirm("Quitter le règne en cours ?")) return;
    if (typeof go === "function") go("president_config", { ...config, launchMode: props?.params?.quickParty === true ? "quick" : "arcade", quickParty: props?.params?.quickParty === true });
  }
  function replay() {
    setState(createInitial()); setUndo([]); setThrowDarts([]); setSelectedTarget(null); setNotice(""); setShowEnd(false); setShowRound(false); setRevealedTurnKey(null); setTrickTransition(null);
    matchIdRef.current = `president-${Date.now()}-${Math.random().toString(36).slice(2,8)}`; savedRef.current = ""; roundCountRef.current = 0;
  }

  React.useEffect(() => {
    const p = profilesById.get(activeId);
    if (!p || !isBotProfile(p, botIds) || state.finished || state.pendingTaxes?.length || showRound || showEnd || trickTransition) { setBotThinking(false); return; }
    let cancelled = false; setBotThinking(true);
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const target = presidentAutoTarget(state, activeId);
      if (!target) { if (state.currentTarget) setState((prev)=>passPresidentTurn(prev,true)); setBotThinking(false); return; }
      const level = String(config.botLevel || "normal");
      const base = level === "hard" ? .64 : level === "easy" ? .26 : .44;
      const difficulty = target.size === 3 ? .55 : target.size === 2 ? .72 : 1;
      const chance = base * difficulty;
      const darts: UiDart[] = [];
      let hit = false;
      for (let i=0;i<3 && !hit;i+=1) {
        if (Math.random() < chance) { darts.push({ v: target.value >= 25 ? 25 : target.value, mult: target.value === 50 ? 2 : target.size as any }); hit = true; }
        else if (config.variant === "chaos" && config.coupEtat && Math.random() < .035) { darts.push({ v:25,mult:2 }); hit = true; }
        else { const miss = Math.random()<.2; darts.push(miss ? {v:0,mult:1} : {v:Math.max(1,Math.min(20,target.value+(Math.random()<.5?-1:1))),mult:1}); }
      }
      setUndo((u)=>[...u.slice(-49),clonePresidentState(state)]);
      setState((prev)=>playPresidentTurn(prev,target,darts.map(toGameDart)));
      setBotThinking(false);
    }, 480);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [activeId, state.trickNo, state.roundNo, state.currentTarget?.value, state.currentTarget?.size, state.pendingTaxes?.length, showRound, showEnd, trickTransition]);

  function buildHistoryRecord() {
    const now = Date.now();
    const standings = getPresidentStandings(state);
    const rows = state.players.map((p:any) => {
      const profile = profilesById.get(p.id) || p; const s = state.statsByPlayer[p.id]; const standingIndex = standings.findIndex((x:any)=>x.id===p.id); const rank = standingIndex>=0 ? standingIndex+1 : 0;
      return {
        id:p.id, playerId:p.id, profileId:p.id, name:playerName(profile), avatarDataUrl:profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null,
        winner:p.id===state.winnerId, win:p.id===state.winnerId, rank, score:s.powerPoints, points:s.powerPoints, powerPoints:s.powerPoints, scoreType:"placement_points_higher_is_better",
        roundsPlayed:s.roundsPlayed, president:s.president, vicePresident:s.vicePresident, citizen:s.citizen, viceTrouDuCul:s.viceTrouDuCul, trouDuCul:s.trouDuCul,
        avgRank:s.roundsPlayed ? Math.round((s.rankTotal/s.roundsPlayed)*100)/100 : 0, bestFinishRank:s.bestFinishRank, worstFinishRank:s.worstFinishRank,
        darts:s.darts, dartsThrown:s.darts, visits:s.visits, successfulPlays:s.successfulPlays, failedPlays:s.failedPlays, successRate:formatPct(s.successfulPlays,s.visits),
        cardsPlayed:s.cardsPlayed, singlesPlayed:s.singlesPlayed, pairsPlayed:s.pairsPlayed, triplesPlayed:s.triplesPlayed, tricksWon:s.tricksWon,
        voluntaryPasses:s.voluntaryPasses, automaticPasses:s.automaticPasses, taxesGiven:s.taxesGiven, taxesReceived:s.taxesReceived, coupEtats:s.coupEtats, revolutions:s.revolutions,
        singles:s.singles, doubles:s.doubles, triples:s.triples, bulls:s.bulls, dbulls:s.dbulls, misses:s.misses, rawStats:s,
      };
    });
    const matchStats = { durationMs:Math.max(0,(state.finishedAt||now)-state.startedAt), roundsPlayed:state.roundResults.length, totalDarts:rows.reduce((a,p)=>a+p.darts,0), totalCardsPlayed:rows.reduce((a,p)=>a+p.cardsPlayed,0), totalTricks:rows.reduce((a,p)=>a+p.tricksWon,0), coupEtats:rows.reduce((a,p)=>a+p.coupEtats,0), revolutions:rows.reduce((a,p)=>a+p.revolutions,0) };
    const summary = { kind:"president", mode:"president", sport:"darts", finished:state.finished, winnerId:state.winnerId, winnerName:playerName(profilesById.get(state.winnerId)), rounds:config.rounds, handSize:config.handSize, variant:config.variant, standings, rankings:standings, players:rows, perPlayer:rows, roundResults:state.roundResults, matchStats, durationMs:matchStats.durationMs, scoreType:"placement_points_higher_is_better", scoreLine:standings.map((x:any)=>`${x.name} ${x.powerPoints} pts`).join(" • "), game:{mode:"president"} };
    return { id:matchIdRef.current, matchId:matchIdRef.current, kind:"president", mode:"president", sport:"darts", status:state.finished?"finished":"in_progress", createdAt:state.startedAt, updatedAt:now, winnerId:state.winnerId, players:rows, game:{mode:"president"}, summary, payload:{ kind:"president", mode:"president", sport:"darts", winnerId:state.winnerId, config, rules:state.rules, players:rows, summary, visits:state.history, visitHistory:state.history, roundResults:state.roundResults, stats:{sport:"darts",mode:"president",players:rows,match:matchStats,global:matchStats}, state:{standings:state.standings,previousRoles:state.previousRoles} } };
  }
  React.useEffect(() => {
    if (!state.finished || savedRef.current === matchIdRef.current) return;
    savedRef.current = matchIdRef.current;
    try { onFinish?.(buildHistoryRecord(), { navigate:false }); } catch {}
  }, [state.finished]);

  // Stable colours: tied to the player ID rather than the active turn.
  const playerPalette = ["#ffc45b", "#40d5f2", "#bf88ff", "#ff8e98", "#7ce2a5", "#ffad5f", "#85a3ff", "#e98ddd"];
  const colorForPlayer = (id: string) => playerPalette[Math.max(0, state.order.indexOf(id)) % playerPalette.length];
  // President order: 3 to Ace, then 2 as the highest card.
  const rankOrder = (value: number) => value === 2 ? 15 : value;
  const standingsLive = getPresidentStandings(state);
  const activeStats = state.statsByPlayer[activeId] || ({} as any);
  const activeStanding = standingsLive.find((row:any)=>row.id===activeId);
  const activeScore = Number(activeStanding?.powerPoints || 0);
  const successRate = formatPct(Number(activeStats.successfulPlays||0), Number(activeStats.visits||0));
  const totalPasses = Number(activeStats.voluntaryPasses||0) + Number(activeStats.automaticPasses||0);
  const totalTaxes = Number(activeStats.taxesGiven||0) + Number(activeStats.taxesReceived||0);
  const passedNames = state.passedPlayerIds.map((id)=>playerName(profilesById.get(id))).join(" · ") || "Aucun";
  const trickEvents = state.history.filter((ev:any)=>ev.roundNo===state.roundNo && ev.trickNo===state.trickNo).slice(-12).reverse();
  const activeColor = activeTeam?.color || roleColor(currentRole, primary);


  const jumpToInput = () => setShowInput(true);
  const jumpToHand = () => { setShowInput(false); setShowHand(true); };
  // A single selection path shared by the table, the hand and the shooting dock.
  // This does not register a dart or mutate the game engine.
  const chooseShot = (target: PresidentTarget) => {
    if (botThinking || needsHandoff || state.finished || state.pendingTaxes?.length) return;
    setSelectedTarget(target);
    setThrowDarts([]);
    setMultiplier(target.value === 50 ? 2 : target.size as 1 | 2 | 3);
    setNotice("");
  };
  // Help is derived from the real, currently legal targets and never invents a playable move.
  const objectiveType = selectedTarget?.size===1 ? "SIMPLE" : selectedTarget?.size===2 ? "DOUBLE" : "TRIPLE";
  const objectiveAim = selectedTarget ? presidentTargetLabel(selectedTarget) : "—";
  const objectiveCardCount = selectedTarget?.size || 0;
  const objectiveExplanation = state.currentTarget
    ? `Pour répondre à ${presidentTargetLabel(state.currentTarget)}, garde le même nombre de cartes et joue une valeur ${state.revolutionActive?"inférieure":"supérieure"}.`
    : "Table libre : choisis une carte, une paire ou un brelan dans ta main.";
  const objectiveInstruction = !activeCanPlay
    ? "Aucune combinaison autorisée dans ta main : utilise PASSER LE PLI."
    : selectedTarget
      ? `Vise ${objectiveAim} sur la cible. Un impact exact en 3 fléchettes maximum pose ${objectiveCardCount} carte${objectiveCardCount>1?"s":""}.`
      : "Sélectionne une carte jouable de ta main pour préparer ton tir.";
  const shotOptions = legalTargets.slice().sort((a,b) =>
    a.size - b.size || (a.value === 2 ? 15 : a.value) - (b.value === 2 ? 15 : b.value)
  );
  const recommendedTarget = shotOptions[0] || null;
  const sameTarget = (a: PresidentTarget | null, b: PresidentTarget | null) => !!a && !!b && a.value === b.value && a.size === b.size;
  const recommendationReason = !recommendedTarget
    ? "Tu n'as actuellement aucun coup légal. Dans cette situation, passe le pli et attends une meilleure ouverture."
    : !state.currentTarget
      ? `La table est libre. Mon conseil est d'ouvrir avec ${presidentTargetLabel(recommendedTarget)} : c'est ton plus petit coup disponible, donc une bonne manière d'alléger ta main sans gaspiller tes cartes les plus fortes.`
      : `Pour répondre à ${presidentTargetLabel(state.currentTarget)}, ${presidentTargetLabel(recommendedTarget)} est le plus petit coup légal disponible. Cela te permet de suivre le pli en économisant tes cartes plus fortes pour plus tard.`;


  return <div className="president-screen" style={{ height:"calc(100dvh - 28px)", minHeight:0, display:"flex", flexDirection:"column", color:text, background:`radial-gradient(circle at 50% -5%,${primary}1f 0,${theme?.bg || "#080b14"} 44%,#020309 100%)`, overflow:"hidden" }}>
    <style>{`
      .president-screen { box-sizing:border-box; }
      .president-game { flex:1; min-height:0; max-width:1120px; width:100%; margin:0 auto; padding:5px 8px max(18px, env(safe-area-inset-bottom)); box-sizing:border-box; display:flex; flex-direction:column; gap:7px; }
      .president-felt { flex:1 1 auto; min-height:0; border:2px solid #9c7833; border-radius:30px; position:relative; overflow:hidden; display:flex; flex-direction:column; padding:12px 14px 12px; background:radial-gradient(ellipse at 50% 46%,#17624d 0%,#0b3d32 54%,#071b1b 100%); box-shadow:inset 0 0 0 5px #0b2b26,inset 0 0 45px #020b0b,0 8px 25px #0008; }
      .president-players { display:flex; justify-content:space-around; gap:10px; flex-wrap:nowrap; flex:0 0 auto; overflow:visible; padding:2px 4px 0; }
      .president-players.president-players-many { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); column-gap:4px; row-gap:4px; justify-items:center; }
      .president-players.president-players-many .president-seat { min-width:0; width:100%; max-width:96px; flex:none; padding:0; }
      /* 3 joueurs : taille de reference de la capture. Au-dela : reductions progressives
         des avatars, des compteurs ET des cases, sans transformer toute la rangee. */
      .president-players { --seat-size:78px; --badge-scale:1; --seat-gap:4px; }
      .president-players.players-4 { --seat-size:70px; --badge-scale:.92; --seat-gap:3px; }
      .president-players.players-5, .president-players.players-6 { --seat-size:62px; --badge-scale:.84; --seat-gap:2px; }
      .president-players.players-7, .president-players.players-8 { --seat-size:54px; --badge-scale:.76; --seat-gap:1px; }
      .president-players.president-players-many .president-seat { min-width:0; width:100%; max-width:96px; flex:none; padding:0; }
      .president-players.president-players-many .president-seat > span { font-size:clamp(8px,1.8vw,10px) !important; }
      .president-players .president-seat { gap:var(--seat-gap); }
      .president-seat-stage { width:var(--seat-size); height:var(--seat-size); }
      .president-seat-badge { transform:scale(var(--badge-scale)); transform-origin:bottom right; }
      @media(max-height:750px) { .president-players.president-players-many { row-gap:0; } }

      .president-seat { display:flex; flex-direction:column; align-items:center; gap:4px; min-width:64px; max-width:108px; flex:1 1 64px; border-radius:18px; border:0; padding:2px; background:transparent; color:white; cursor:pointer; }
      .president-center { flex:1; min-height:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:10px; padding:4px 0; }
      .president-hand { display:flex; align-items:center; gap:clamp(3px,.7vw,9px); overflow-x:auto; scrollbar-width:thin; padding:4px 3px 8px; flex:0 0 auto; min-height:0; }
      .president-hand-card { flex:0 0 auto; cursor:pointer; background:transparent; border:2px solid transparent; border-radius:9px; padding:2px; transition:transform .12s; }
      .president-hand-card[aria-pressed="true"] { transform:translateY(-5px); border-color:#ffc857; background:#ffc85730; }
      .president-hand-card:disabled { opacity:.46; cursor:not-allowed; }
      .president-hand-card > div { width:clamp(47px,8.5vh,78px) !important; height:clamp(68px,12vh,111px) !important; }
      .president-tools { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:5px; flex:0 0 auto; padding-bottom:4px; min-height:54px; }
      .president-tool { border-radius:14px; min-height:49px; border:1px solid #ffffff35; background:linear-gradient(180deg,rgba(24,28,36,.96),rgba(8,10,15,.96)); color:#f5e6c3; padding:6px 2px; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; font-size:9px; font-weight:950; box-shadow:inset 0 1px 0 rgba(255,255,255,.05); }
      .president-tool strong { width:24px; height:24px; border-radius:999px; display:grid; place-items:center; font-size:14px; line-height:1; border:1px solid currentColor; background:rgba(255,255,255,.05); }
      /* Bubble artwork retains its exact aspect ratio; text stays inside its white ellipse. */
      .president-advice-art { display:block; position:relative; flex:0 0 auto; width:min(100%,320px); aspect-ratio:1958/803; border:0; padding:0; margin:0 auto; cursor:pointer; background:transparent; box-sizing:border-box; text-align:center; filter:drop-shadow(0 5px 10px rgba(0,0,0,.20)); container-type:inline-size; }
      .president-advice-image { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; pointer-events:none; }
      .president-advice-text { position:absolute; left:43%; top:17%; width:47%; height:66%; display:flex; flex-direction:column; align-items:center; justify-content:center; box-sizing:border-box; overflow:hidden; color:#17202b; font-family:inherit; pointer-events:none; text-align:center; line-height:1.13; }
      .president-advice-title { display:block; flex:0 0 auto; font-weight:1100; font-size:clamp(8px,2.7cqw,10px); letter-spacing:.1px; line-height:1.1; color:#e630a2; margin-bottom:clamp(2px,0.9cqw,4px); }
      .president-advice-copy { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:3; overflow:hidden; font-size:clamp(8px,2.65cqw,10px); line-height:1.15; font-weight:800; overflow-wrap:normal; word-break:normal; text-align:center; }
      @media(max-width:430px){ .president-advice-art { width:min(100%,288px); } .president-advice-copy { font-size:clamp(7.5px,2.75cqw,9.5px); } }
      .president-objective { width:min(100%,620px); border:1px solid #68e5b47a; border-radius:22px; background:linear-gradient(145deg,#082d29f6,#031311eb); padding:10px 14px; box-sizing:border-box; text-align:left; color:#e6fff4; cursor:pointer; box-shadow:0 8px 24px #0006; position:relative; overflow:visible; }
      .president-objective b {color:#8affd0;}
      .president-objective .objective-head {display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px;color:#8affd0;font-weight:1100;}
      .president-objective .objective-help {font-size:10px;line-height:1.35;margin-top:5px;}
      @media(max-width:430px){.president-tool {font-size:8px;padding:4px 1px;} .president-tool strong {font-size:17px;} .president-objective {padding:8px;} }
      .president-keypad-modal { position:fixed; inset:0; z-index:9997; background:#000c; backdrop-filter:blur(9px); display:flex; justify-content:center; align-items:center; padding:12px; box-sizing:border-box; }
      .president-keypad-inner { width:min(550px,100%); max-height:calc(100dvh - 24px); overflow-y:auto; border-radius:20px; background:#10131b; border:1px solid #dca8438a; padding:12px; box-sizing:border-box; overscroll-behavior:contain; }
      @media (max-height:710px) { .president-advice-art { width:min(100%,260px); } .president-objective .objective-help {font-size:9px;} .president-objective {padding:6px 9px;} .president-game { gap:4px; } .president-felt {padding:5px;} .president-seat {padding:2px;} .president-players.president-players-many .president-seat {padding:0;} .president-tools .president-tool {min-height:39px;} .president-hand-card > div {width:clamp(37px,8vh,58px) !important;height:clamp(54px,11vh,84px) !important;} }
      @media (orientation:landscape) and (max-height:520px) { .president-felt {flex-direction:row; gap:9px;} .president-players {width:26%;max-height:none;align-content:center;} .president-center {flex:1;} .president-hand {width:47%;align-self:center;} .president-hand-card > div {width:45px !important;height:64px !important;} }
    `}</style>
    <PageHeader tickerSrc={tickerPresident} tickerAlt="PRÉSIDENT" tickerFit="cover" tickerHeight={90} tickerEdgeFade="default" tickerBottomGap={4} tickerImageScale={1} left={<div style={{marginLeft:8}}><BackDot onClick={back} color={primary} glow={`${primary}77`} title="Retour configuration" /></div>} right={<div style={{marginRight:8}}><InfoDot title="Règles Président" color={primary} glow={`${primary}77`} content={<RulesContent config={config} primary={primary} />} /></div>} />
    <main className="president-game">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,fontSize:10,color:"#f7d48c",fontWeight:1000,flex:"0 0 auto"}}>
        <span>♛ MANCHE {Math.min(state.roundNo,config.rounds)}/{config.rounds} · PLI {state.trickNo}</span>
        <span>{state.revolutionActive?"⚡ RÉVOLUTION · ":""}{hand.length} CARTES · {activeStanding?.powerPoints || 0} PTS</span>
      </div>
      <section className="president-felt" aria-label="Tapis de jeu Président">
        <div className={`president-players players-${state.order.length} ${state.order.length > 4 ? "president-players-many" : ""}`}>
          {state.order.map((id:string)=>{const p=profilesById.get(id);const active=id===activeId;const passed=state.passedPlayerIds.includes(id);const done=state.finishedPlayerIds.includes(id);const role=state.previousRoles?.[id] || "Citoyen"; const roleMeta=roleMiniMeta(role); const playerColor=colorForPlayer(id); return <button type="button" key={id} className="president-seat" onClick={()=>setShowTrick(true)} style={{opacity:passed?.62:1}}>
            <div className="president-seat-stage" style={{position:"relative", display:"grid", placeItems:"center"}}>
              <div aria-hidden style={{position:"absolute", inset: active ? -6 : 4, borderRadius:999, background: active ? `radial-gradient(circle, ${playerColor}70 0%, ${playerColor}30 42%, transparent 74%)` : `radial-gradient(circle, ${playerColor}2c 0%, transparent 72%)`, filter:"blur(2px)"}} />
              <div className="president-avatar" style={{position:"relative", zIndex:2, transform: active ? "scale(1.06)" : undefined, border:`2px solid ${playerColor}`, borderRadius:"50%", padding:1, boxShadow:`0 0 ${active?24:9}px ${playerColor}${active?"99":"55"}`}}><ProfileAvatar profile={p} size={state.order.length <= 3 ? 58 : state.order.length === 4 ? 52 : state.order.length <= 6 ? 46 : 40}/></div>
              <div className="president-seat-badge" style={{position:"absolute", right:-5, bottom:1, zIndex:3}}><PresidentCardCount compact count={state.hands[id]?.length||0} color={`${playerColor}99`}/></div>
              {roleMeta ? <div title={roleMeta.label} style={{position:"absolute", left:-2, bottom:4, zIndex:3, width:24, height:24, borderRadius:999, background:"rgba(5,11,14,.92)", border:`1px solid ${roleMeta.color}88`, color:roleMeta.color, display:"grid", placeItems:"center", fontSize:12, boxShadow:"0 4px 12px rgba(0,0,0,.28)"}}>{roleMeta.icon}</div> : null}
            </div>
            <span style={{fontSize:11,fontWeight:1000,maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap", color:playerColor, textTransform:"uppercase"}}>{playerName(p).toUpperCase()}</span>
          </button>})}
        </div>
        <div className="president-center">

          <button type="button" onClick={()=>setShowTrick(true)} style={{border:0,background:"transparent",padding:0,cursor:"pointer",width:"100%",display:"grid",placeItems:"center"}}>
            <FeltTableCards target={state.currentTarget} history={state.history} roundNo={state.roundNo} trickNo={state.trickNo} primary={primary} />
          </button>
          <button type="button" className="president-advice-art" onClick={()=>{setAdviceTab("conseil");setShowObjective(true);}} aria-label="Lire le conseil d’Awena et ouvrir les détails">
            <img className="president-advice-image" src={awenaAdviceBubble} draggable={false} alt="Awena donne un conseil" />
            <span className="president-advice-text">
              <span className="president-advice-title">CONSEIL D’AWENA</span>
              <span className="president-advice-copy">{!activeCanPlay ? "Aucun coup possible. Passe ce pli." : selectedTarget ? `Vise ${objectiveAim}. Une touche juste sur 3 essais : ${objectiveCardCount} carte${objectiveCardCount > 1 ? "s" : ""} posée${objectiveCardCount > 1 ? "s" : ""} !` : "Choisis une carte, puis ouvre SAISIE pour jouer."}</span>
            </span>
          </button>
          {throwDarts.length>0?<div style={{fontSize:10,color:"#9bffc8"}}>VOLÉE : {throwDarts.map(d=>presidentDartLabel(toGameDart(d))).join(" · ")} / 3</div>:null}
          {botThinking?<div style={{color:"#68d6ff",fontWeight:1000}}>BOT EN TRAIN DE JOUER…</div>:null}
        </div>
        <div style={{flex:"0 0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,color:"#ffcf76",fontWeight:1000,fontSize:11,padding:"2px 3px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:9,minWidth:0}}>
            <ProfileAvatar profile={activeProfile} size={42}/>
            <div style={{display:"grid",gap:2,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:1100,color:colorForPlayer(activeId),whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{playerName(activeProfile).toUpperCase()}</div>
              <div style={{fontSize:10,color:"#ffe2a5",fontWeight:1000}}>TON COUP : {selectedTarget ? presidentTargetLabel(selectedTarget) : "—"}</div>
            </div>
            <PresidentCardCount count={hand.length}/>
          </div>
          <button type="button" onClick={()=>setShowHand(true)} style={{border:"1px solid #d3ab5f66",background:"#0006",borderRadius:20,color:"#ffe2ab",padding:"5px 11px",fontSize:10, whiteSpace:"nowrap"}}>COMBINAISONS</button>
        </div>
        <div className="president-hand" role="group" aria-label="Ma main : sélectionner une carte">
          {hand.map((value:number,index:number)=>({value,index,suit:(state.suitsByPlayer?.[activeId]||[])[index]||0})).sort((a,b)=>rankOrder(a.value)-rankOrder(b.value)||a.suit-b.suit).map(({value,index,suit})=>{const options=legalTargets.filter(t=>t.value===value);const chosen=selectedTarget?.value===value;return <button type="button" key={index} className="president-hand-card" aria-pressed={!!chosen} disabled={!options.length||botThinking||needsHandoff} title={options.length?`Jouer ${presidentCardRank(value)} · ${options.length} combinaison(s) possibles`:"Carte non jouable sur ce pli"} onClick={()=>chooseShot(options.find(t=>t.size===selectedTarget?.size)||options[0])}><PlayingCard value={value} suitIndex={suit}/></button>})}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1.25fr)",gap:7,flex:"0 0 auto",padding:"2px 2px 0"}}>
          <button type="button" onClick={passTurn} disabled={!state.currentTarget||botThinking||needsHandoff} style={action("#ffab70",!state.currentTarget||botThinking||needsHandoff)}>↪ PASSER LE PLI</button>
          <button type="button" onClick={jumpToInput} disabled={botThinking||needsHandoff} style={{...action(primary,botThinking||needsHandoff),background:botThinking||needsHandoff?"#24242b":`linear-gradient(110deg,${primary}44,${primary}17)`,fontSize:15}}><span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8}}><KpiIcon name="darts" size={20}/> SAISIE</span></button>
        </div>
      </section>
      <nav className="president-tools" aria-label="Actions et informations de jeu">
        <button type="button" className="president-tool" onClick={()=>{setAdviceTab("conseil");setShowObjective(true);}} style={{borderColor:"#72e7ba88",color:"#a6ffd8"}}><strong>💡</strong>CONSEIL</button>
        <button type="button" className="president-tool" onClick={()=>setShowHand(true)}><strong>♠</strong>MAIN</button>
        <button type="button" className="president-tool" onClick={()=>setShowTrick(true)}><strong>◎</strong>PLI / TABLE</button>
        <button type="button" className="president-tool" onClick={()=>setShowStats(true)}><strong>▥</strong>STATS</button>
        <button type="button" className="president-tool" onClick={()=>setShowTable(true)}><strong>♛</strong>CLASSEMENT</button>
        <button type="button" className="president-tool" onClick={()=>setShowArchive(true)}><strong>▤</strong>ARCHIVES</button>
      </nav>
    </main>
    {showInput && !botThinking ? <div className="president-keypad-modal" role="presentation" onClick={()=>setShowInput(false)}>
      <div className="president-keypad-inner" role="dialog" aria-modal="true" aria-label="Saisie des fléchettes" onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,marginBottom:10}}><b style={{color:primary,fontSize:14}}>🎯 SAISIE DES FLÉCHETTES</b><button type="button" onClick={()=>setShowInput(false)} style={{...action(primary),minHeight:36,padding:"0 12px"}}>✕ FERMER</button></div>
        <div style={{fontWeight:1000,color:"#bdeee1",fontSize:11,marginBottom:7}}>{selectedTarget?`VISER ${presidentTargetLabel(selectedTarget)} · ${presidentTargetDescription(selectedTarget)}`:"AUCUN COUP LÉGAL · PASSER LE PLI"}</div>
        <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:6,marginBottom:8}}>{shotOptions.map(target=><button type="button" key={`${target.value}-${target.size}`} onClick={()=>chooseShot(target)} disabled={throwDarts.length>0} style={{...action(primary),minWidth:53,minHeight:37,flex:"0 0 auto",padding:"4px 7px",background:selectedTarget?.value===target.value&&selectedTarget?.size===target.size?`${primary}55`:"#ffffff0a"}}>{presidentTargetLabel(target)}</button>)}</div>
        <div style={{display:"flex",gap:5,marginBottom:8}}>{[0,1,2].map(i=><div key={i} style={{flex:1,textAlign:"center",background:"#ffffff0a",borderRadius:8,padding:6,fontSize:11,color:throwDarts[i]?"#9bffc8":"#b4c5c8"}}>FLÉCHETTE {i+1}<div style={{fontWeight:1000,fontSize:14}}>{throwDarts[i]?presidentDartLabel(toGameDart(throwDarts[i])):"—"}</div></div>)}</div>
        {config.scoreInputMethod === "dartboard" ? <><div style={{display:"grid",placeItems:"center",opacity:selectedTarget?1:.45,pointerEvents:selectedTarget?"auto":"none"}}><DartboardClickable multiplier={multiplier} onHit={(segment,mult)=>addDart(segment,mult)} size={Math.min(310,Math.max(235,window.innerWidth-42))}/></div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginTop:8}}><button onClick={undoTurn} style={action(primary)}>ANNULER</button><button disabled={!state.currentTarget} onClick={passTurn} style={action("#ff9a70",!state.currentTarget)}>PASSER</button><button disabled={!throwDarts.length} onClick={validateAttempt} style={action("#6ee7b7",!throwDarts.length)}>VALIDER</button></div></> : <Keypad currentThrow={throwDarts as any} multiplier={multiplier} onSimple={()=>setMultiplier(1)} onDouble={()=>setMultiplier(2)} onTriple={()=>setMultiplier(3)} onCancel={undoTurn} onBackspace={()=>setThrowDarts(d=>d.slice(0,-1))} onNumber={n=>addDart(n)} onBull={bull=>addDart(25,bull===50?2:1)} onValidate={validateAttempt} hidePreview hideTotal centerSlot={<div style={{textAlign:"center"}}><div style={{color:primary,fontWeight:1100,fontSize:12}}>{selectedTarget?presidentTargetLabel(selectedTarget):"—"}</div><button disabled={!state.currentTarget} onClick={e=>{e.stopPropagation();passTurn();}} style={{marginTop:2,border:0,background:"transparent",color:"#ffae77",fontSize:9}}>PASSER</button></div>} noticeSlot={notice?<span>{notice}</span>:null} validateAttention={throwDarts.length>0} safeBottomPad={false}/>} 
        <button type="button" onClick={()=>setShowInput(false)} style={{...action(primary),width:"100%",marginTop:8,minHeight:34}}>RETOUR AU TAPIS</button>
      </div>
    </div>:null}

    {showObjective ? <ModalShell title="💡 CONSEIL · AWENA" color="#72e7ba" onClose={()=>setShowObjective(false)} wide>
      <AdviceTabsContent
        tab={adviceTab}
        setTab={setAdviceTab}
        primary={primary}
        selectedTarget={selectedTarget}
        recommendedTarget={recommendedTarget}
        recommendationReason={recommendationReason}
        objectiveExplanation={objectiveExplanation}
        objectiveInstruction={objectiveInstruction}
        activeCanPlay={activeCanPlay}
        currentTarget={state.currentTarget}
        handCount={hand.length}
        onOpenInput={()=>{ if(activeCanPlay){ setShowObjective(false); setShowInput(true); } }}
      />
    </ModalShell> : null}

    {showHelp ? <ModalShell title="COMMENT JOUER AU PRÉSIDENT" color={primary} onClose={()=>setShowHelp(false)}><RulesContent config={config} primary={primary}/><button onClick={()=>setShowHelp(false)} style={{...action(primary),width:"100%",marginTop:12}}>J'AI COMPRIS · JOUER</button></ModalShell>:null}
    {showHand ? <ModalShell title="♠ MAIN & COMBINAISONS" color="#ffd45c" onClose={()=>setShowHand(false)} wide>
      <div className="president-hand-detail" style={{display:"grid",gap:11,color:"#fff",minWidth:0}}>
        {/* En-tête joueur : simple et identifiable, sans carte décorative géante. */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:9,minWidth:0}}>
            <ProfileAvatar profile={activeProfile} size={37}/>
            <div style={{minWidth:0}}><div style={{color:colorForPlayer(activeId),fontWeight:1100,fontSize:13,textTransform:"uppercase",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{playerName(activeProfile)}</div>
              <div style={{fontSize:10,color:"#b9c9c6"}}>Sélectionne un coup puis vise sa cible.</div>
            </div>
          </div>
          <div style={{flex:"0 0 auto",padding:"5px 10px",borderRadius:12,border:"1px solid #d9b56270",background:"#16150f",color:"#ffde91",fontWeight:1100,fontSize:15}}>{hand.length} <span style={{fontSize:9,fontWeight:800}}>CARTES</span></div>
        </div>

        {/* On conserve les véritables cartes et leurs enseignes, sans les cacher dans un paquet. */}
        <section style={{borderRadius:15,padding:"10px 9px",background:"rgba(13,32,29,.78)",border:"1px solid rgba(163,225,193,.22)",minWidth:0}}>
          <div style={{fontSize:10,color:"#c3ead5",fontWeight:1000,letterSpacing:.65,marginBottom:7}}>TES CARTES · DE LA PLUS FAIBLE À LA PLUS FORTE</div>
          <div role="group" aria-label="Cartes de la main" style={{display:"flex",gap:6,overflowX:"auto",padding:"5px 3px 11px",scrollbarWidth:"thin",minWidth:0}}>
            {hand.map((value:number,index:number)=>({value,index,suit:(state.suitsByPlayer?.[activeId]||[])[index]??0})).sort((a,b)=>rankOrder(a.value)-rankOrder(b.value)||a.suit-b.suit).map(({value,index,suit})=>{
              const choices=legalTargets.filter(t=>t.value===value);
              const chosen=!!selectedTarget && selectedTarget.value===value;
              return <button key={index} type="button" disabled={!choices.length||botThinking||needsHandoff} aria-pressed={chosen} onClick={()=>chooseShot(choices.find(t=>t.size===selectedTarget?.size)||choices[0])} title={choices.length?`Choisir ${presidentCardRank(value)}`:"Carte non jouable sur ce pli"} style={{flex:"0 0 auto",padding:3,borderRadius:10,border:`2px solid ${chosen?"#ffd45c":"transparent"}`,background:chosen?"rgba(255,206,85,.13)":"transparent",opacity:choices.length?1:.48,cursor:choices.length?"pointer":"not-allowed",transform:chosen?"translateY(-3px)":undefined}}><PlayingCard value={value} suitIndex={suit}/></button>;
            })}
          </div>
        </section>

        {/* Un choix = une combinaison valide, classée par type. */}
        <section style={{borderRadius:15,padding:"10px 11px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.12)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:8,flexWrap:"wrap"}}>
            <b style={{color:"#ffdf97",fontSize:11,letterSpacing:.4}}>COUPS POSSIBLES</b>
            <span style={{fontSize:10,color:"#b7c9c2"}}>{state.currentTarget?`À battre : ${presidentTargetLabel(state.currentTarget)}`:"Table libre · choisis ton ouverture"}</span>
          </div>
          {legalTargets.length ? <div style={{display:"grid",gap:9}}>
            {([1,2,3] as const).map(size=>{
              const choices=legalTargets.filter((t:PresidentTarget)=>t.size===size).sort((a:PresidentTarget,b:PresidentTarget)=>rankOrder(a.value)-rankOrder(b.value));
              if(!choices.length)return null;
              const caption=size===1?"1 CARTE · SIMPLE":size===2?"2 CARTES · DOUBLE":"3 CARTES · TRIPLE";
              const color=size===1?"#e4e7e6":size===2?"#69cdf7":"#ffc17d";
              return <div key={size} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr)",gap:5}}>
                <span style={{fontSize:9.5,fontWeight:1000,color}}>{caption}</span>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {choices.map((target:PresidentTarget)=>{const active=selectedTarget?.size===target.size&&selectedTarget?.value===target.value;
                    return <button type="button" key={`${size}-${target.value}`} aria-pressed={!!active} onClick={()=>chooseShot(target)} disabled={botThinking||needsHandoff} style={{minWidth:50,minHeight:38,padding:"5px 12px",borderRadius:11,border:`1px solid ${active?"#ffd268":"rgba(255,255,255,.18)"}`,background:active?"rgba(255,206,85,.19)":"rgba(255,255,255,.06)",color:active?"#ffe19d":"#f6f8f8",fontWeight:1100,fontSize:15,cursor:"pointer"}}>{presidentTargetLabel(target)}</button>;
                  })}
                </div>
              </div>;
            })}
          </div> : <div style={{fontSize:12,color:"#ffb68d",padding:"6px 0"}}>Aucun coup légal : tu dois passer le pli.</div>}
        </section>

        {/* Aperçu compact à la place de l'ancienne grande carte verticale. */}
        <section style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",borderRadius:15,padding:"11px 12px",border:"1px solid #e9c56c66",background:"linear-gradient(105deg,rgba(69,53,23,.46),rgba(7,29,26,.75))"}}>
          <div style={{display:"grid",gap:4,flex:"1 1 190px"}}>
            <div style={{fontSize:10,color:"#ffda89",fontWeight:1100}}>TON COUP SÉLECTIONNÉ</div>
            <div style={{fontSize:22,color:"#ffe2a6",fontWeight:1100,lineHeight:1.15}}>{selectedTarget?presidentTargetLabel(selectedTarget):"—"}</div>
            <div style={{fontSize:11,color:"#deebe2",lineHeight:1.42}}>{selectedTarget?`Vise ${presidentTargetLabel(selectedTarget)} : ${selectedTarget.size} carte${selectedTarget.size>1?"s":""} à poser. Tu as 3 fléchettes maximum.`:"Choisis une carte ou une combinaison dans les options ci-dessus."}</div>
          </div>
          {selectedTarget ? <div style={{display:"flex",alignItems:"center",gap:3,flex:"0 0 auto"}}>{hand.map((value:number,index:number)=>({value,index,suit:(state.suitsByPlayer?.[activeId]||[])[index]??0})).filter(c=>c.value===selectedTarget.value).slice(0,selectedTarget.size).map(c=><PlayingCard key={c.index} value={c.value} suitIndex={c.suit} mini/>)}</div> : null}
        </section>
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1.1fr)",gap:8}}>
          <button type="button" onClick={()=>setShowHand(false)} style={{minHeight:42,borderRadius:12,border:"1px solid rgba(255,255,255,.2)",background:"rgba(255,255,255,.06)",color:"#f2f3ed",fontWeight:1000,cursor:"pointer"}}>RETOUR AU TAPIS</button>
          <button type="button" disabled={!selectedTarget||botThinking||needsHandoff} onClick={()=>{setShowHand(false);setShowInput(true);}} style={{minHeight:42,borderRadius:12,border:"1px solid #f3c86688",background:selectedTarget?"linear-gradient(110deg,#74571b,#c99c35)":"rgba(255,255,255,.06)",color:selectedTarget?"#fff7e0":"#737880",fontWeight:1100,cursor:selectedTarget?"pointer":"not-allowed"}}>↗ OUVRIR LA SAISIE</button>
        </div>
      </div>
    </ModalShell>:null}

    {showArchive ? <ModalShell title="ARCHIVES DES PLIS" color="#e9c56c" onClose={()=>setShowArchive(false)} wide><PresidentTrickArchive state={state} profilesById={profilesById} primary={primary}/></ModalShell> : null}

    {showTrick ? <ModalShell title={`TABLE · MANCHE ${state.roundNo} · PLI ${state.trickNo}`} color="#43d8ff" onClose={()=>setShowTrick(false)}>
      <button type="button" onClick={()=>{setShowTrick(false);setShowArchive(true);}} style={{width:"100%",minHeight:38,marginBottom:9,borderRadius:10,border:`1px solid ${primary}55`,background:`${primary}12`,color:primary,fontWeight:1000,cursor:"pointer"}}>♠ CONSULTER TOUS LES PLIS ET LEURS CARTES</button>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,minmax(0,1fr))", gap:6 }}><MiniKpi label="À BATTRE" value={state.currentTarget?presidentTargetLabel(state.currentTarget):"LIBRE"} color="#43d8ff"/><MiniKpi label="DERNIER COUP" value={state.lastSuccessfulPlayerId?playerName(profilesById.get(state.lastSuccessfulPlayerId)):"—"} color="#72efad"/><MiniKpi label="PASSÉS" value={state.passedPlayerIds.length} color="#ff9b67"/></div>
      <div style={{ ...panel(), marginTop:8, padding:9 }}><div style={{ color:"#43d8ff", fontSize:10, fontWeight:1100, marginBottom:6 }}>ÉTAT DES JOUEURS</div>{state.order.map((id:string)=>{const p=profilesById.get(id);const active=id===activeId;const passed=state.passedPlayerIds.includes(id);const done=state.finishedPlayerIds.includes(id);return <div key={id} style={{ display:"grid",gridTemplateColumns:"34px minmax(0,1fr) auto auto",gap:7,alignItems:"center",padding:"6px 5px",borderBottom:"1px solid rgba(255,255,255,.055)",background:active?`${primary}0d`:"transparent" }}><ProfileAvatar profile={p} size={30}/><div style={{ minWidth:0 }}><div style={{ color:active?primary:"#fff",fontWeight:1000,fontSize:11,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{playerName(p)}</div><div style={{ color:"rgba(255,255,255,.45)",fontSize:8.5 }}>{state.previousRoles[id]||"Citoyen"}</div></div><div style={{ color:"#ffd45c",fontWeight:1100 }}>{state.hands[id]?.length||0}</div><div style={{ color:done?"#72efad":passed?"#ff9b67":"rgba(255,255,255,.42)",fontSize:8.5,fontWeight:1000 }}>{done?"FINI":passed?"PASS":"EN JEU"}</div></div>})}</div>
      <div style={{ ...panel(), marginTop:8, padding:9 }}><div style={{ color:"#43d8ff",fontSize:10,fontWeight:1100,marginBottom:6 }}>DERNIERS COUPS DU PLI</div>{trickEvents.length?trickEvents.map((ev:any)=><div key={ev.id} style={{ display:"grid",gridTemplateColumns:"minmax(0,1fr) auto auto",gap:8,padding:"6px 2px",borderBottom:"1px solid rgba(255,255,255,.05)",fontSize:9.5 }}><b>{playerName(profilesById.get(ev.playerId))}</b><span style={{ color:ev.success?"#72efad":"#ff9b67",fontWeight:1000 }}>{ev.success?presidentTargetLabel(ev.target):"PASS"}</span><span style={{ color:"rgba(255,255,255,.48)" }}>{ev.labels?.join(" · ")||"—"}</span></div>):<div style={{ color:"rgba(255,255,255,.48)",fontSize:10 }}>Aucun coup joué sur ce pli.</div>}</div>
    </ModalShell>:null}

    {showStats ? <ModalShell title="STATISTIQUES PRÉSIDENT" color="#c45cff" onClose={()=>setShowStats(false)} wide>
      <div style={{ ...panel(), padding:9, borderColor:`${activeColor}55` }}><div style={{ display:"grid",gridTemplateColumns:"44px minmax(0,1fr) auto",gap:9,alignItems:"center" }}><ProfileAvatar profile={activeProfile} size={40}/><div><div style={{ color:activeColor,fontWeight:1100 }}>{playerName(activeProfile)}</div><div style={{ color:"rgba(255,255,255,.48)",fontSize:9 }}>{currentRole}</div></div><div style={{ color:"#c45cff",fontSize:22,fontWeight:1100 }}>{activeStanding?.powerPoints || 0} pts</div></div></div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:5,marginTop:7 }}><MiniKpi label="RÉUSSITE" value={`${successRate}%`} color="#72efad"/><MiniKpi label="CARTES JOUÉES" value={activeStats.cardsPlayed||0} color="#ffd45c"/><MiniKpi label="PLIS GAGNÉS" value={activeStats.tricksWon||0} color="#43d8ff"/><MiniKpi label="PRÉSIDENCES" value={activeStats.president||0} color="#ffb347"/></div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:5,marginTop:5 }}><MiniKpi label="SIMPLES" value={activeStats.singlesPlayed||0} color="#f0f3ff"/><MiniKpi label="PAIRES" value={activeStats.pairsPlayed||0} color="#39c9ff"/><MiniKpi label="BRELANS" value={activeStats.triplesPlayed||0} color="#c45cff"/><MiniKpi label="ÉCHECS" value={activeStats.failedPlays||0} color="#ff6f86"/></div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:5,marginTop:5 }}><MiniKpi label="DARTS" value={activeStats.darts||0} color={primary}/><MiniKpi label="PASS" value={totalPasses} color="#ff9b67"/><MiniKpi label="TAXES" value={totalTaxes} color="#ffcf57"/><MiniKpi label="COUPS D'ÉTAT" value={activeStats.coupEtats||0} color="#ff6e55"/></div>
      <div style={{ ...panel(), marginTop:8, padding:9 }}><div style={{ color:"#c45cff",fontSize:10,fontWeight:1100,marginBottom:6 }}>COMPARATIF JOUEURS</div>{standingsLive.map((row:any,i:number)=>{const st=state.statsByPlayer[row.id];const rate=formatPct(st.successfulPlays,st.visits);return <div key={row.id} style={{ display:"grid",gridTemplateColumns:"24px 32px minmax(0,1fr) repeat(3,auto)",gap:6,alignItems:"center",padding:"6px 2px",borderBottom:"1px solid rgba(255,255,255,.05)" }}><div style={{ color:i===0?"#ffd45c":"rgba(255,255,255,.55)",fontWeight:1100 }}>{i+1}</div><ProfileAvatar profile={profilesById.get(row.id)} size={28}/><div style={{ minWidth:0,fontWeight:1000,fontSize:10,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{row.name}</div><div style={{ color:"#c45cff",fontWeight:1100,fontSize:10 }}>{row.powerPoints} pts</div><div style={{ color:"#43d8ff",fontWeight:1000,fontSize:9 }}>{st.tricksWon} plis</div><div style={{ color:"#72efad",fontWeight:1000,fontSize:9 }}>{rate}%</div></div>})}</div>
    </ModalShell>:null}

    {!showRound && !state.finished && Boolean(state.pendingTaxes?.length) ? <TaxExchangeOverlay key={`${state.roundNo}-${state.pendingTaxes?.[0]?.highId}`} state={state} profilesById={profilesById} primary={primary} onConfirm={(indices:number[])=>{setUndo(u=>[...u.slice(-49),clonePresidentState(state)]);setState(prev=>resolvePresidentTax(prev,indices));setSelectedTarget(null);setThrowDarts([]);}}/> : null}
    {showRound && latestRound && !state.finished ? <RoundOverlay result={latestRound} state={state} profilesById={profilesById} primary={primary} onClose={()=>setShowRound(false)} /> : null}
    {trickTransition && !showRound && !showEnd ? <PresidentTrickTransition data={trickTransition} profilesById={profilesById} primary={primary} onContinue={()=>setTrickTransition(null)}/> : null}
    {showEnd && state.finished ? <EndOverlay state={state} profilesById={profilesById} primary={primary} onClose={()=>setShowEnd(false)} onReplay={replay} onHistory={()=>{ try { onFinish?.(buildHistoryRecord(),{navigate:true}); } catch { if(typeof go==="function") go("statsHub",{tab:"history"}); } }} /> : null}
    {showTable ? <ModalShell title="CLASSEMENT DU RÈGNE" color="#ffb347" onClose={()=>setShowTable(false)}><div style={{ display:"grid", gap:6 }}>{standingsLive.map((row:any,i:number)=>{ const st=state.statsByPlayer[row.id]; const role=state.previousRoles[row.id]||"Citoyen"; return <div key={row.id} style={{ display:"grid",gridTemplateColumns:"26px 36px minmax(0,1fr) auto auto",gap:7,alignItems:"center",padding:8,borderRadius:12,background:i===0?"rgba(255,179,71,.09)":"rgba(255,255,255,.035)",border:`1px solid ${i===0?"#ffb34755":"rgba(255,255,255,.06)"}` }}><div style={{ color:i===0?"#ffd45c":"#fff",fontWeight:1100 }}>{i+1}.</div><ProfileAvatar profile={profilesById.get(row.id)} size={32}/><div style={{ minWidth:0 }}><div style={{ color:roleColor(role,primary),fontWeight:1100,fontSize:11,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{row.name}</div><div style={{ color:"rgba(255,255,255,.45)",fontSize:8.5 }}>{role} · {state.hands[row.id]?.length||0} cartes</div></div><div style={{ color:"#43d8ff",fontWeight:1000,fontSize:9 }}>{st.tricksWon} plis</div><div style={{ color:"#ffb347",fontSize:18,fontWeight:1100 }}>{row.powerPoints} pts</div></div>})}</div></ModalShell> : null}
    {needsHandoff ? <PlayerHandoffOverlay key={turnKey} profile={activeProfile} cards={hand.length} roundNo={state.roundNo} trickNo={state.trickNo} primary={primary} onReveal={()=>setRevealedTurnKey(turnKey)}/> : null}
  </div>;
}

function action(color:string,disabled=false):React.CSSProperties { return { minHeight:42,borderRadius:13,border:`1px solid ${disabled?"rgba(255,255,255,.08)":color+"88"}`,background:disabled?"rgba(255,255,255,.03)":`${color}18`,color:disabled?"#555a70":color,fontWeight:1000,cursor:disabled?"not-allowed":"pointer" }; }

export default PresidentStandardPlay;
