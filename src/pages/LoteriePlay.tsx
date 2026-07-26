// @ts-nocheck
// =============================================================
// LOTERIE — Play V5
// - Header ticker natif
// - Bloc joueur actif calqué BASEBALL/CAPITAL
// - Cartons en bloc flottant / carrousel
// - Keypad natif Darts Counter
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import Keypad from "../components/Keypad";
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import tickerLoterie from "../assets/tickers/ticker_loterie.png";
import scratchTicketPreview from "../assets-webp/games/loterie-ticket-scratch-v2.png";
import scratchCellTexture from "../assets-webp/games/loterie-scratch-cell-texture.png";
import {
  bestCardProgress,
  buildPlayerStates,
  cardProgress,
  dartLabel,
  dartScore,
  hasWon,
  revealResult,
  volleyScore,
  type LoterieConfig,
  type LoterieDart,
  type LoteriePlayerState,
} from "../lib/loterie";

const GOLD = "#f6c256";
const PINK = "#ff63b8";
const CYAN = "#42d6ff";
const GOOD = "#70efbd";
const BAD = "#ff718a";
const STROKE = "rgba(255,255,255,.105)";
const SOFT = "rgba(226,232,240,.72)";

const DEFAULT_CONFIG: LoterieConfig & any = {
  variant: "classic",
  level: "auto",
  autoMode: "balanced",
  volleyMode: "strict3",
  expressTarget: "simple",
  cardsPerPlayer: 2,
  cellsPerCard: 10,
  startOrderMode: "random",
  participantMode: "players",
};

function nameOf(p: any) { return String(p?.displayName ?? p?.name ?? p?.nickname ?? "Joueur"); }
function avatarOf(p: any) { return p?.avatarDataUrl ?? p?.avatarUrl ?? p?.avatar ?? null; }
function isBotLike(p: any) { return Boolean(p?.isBot || p?.bot || p?.kind === "bot" || p?.botLevel || p?.isBotTeam); }
function makeFallbackPlayers(store: any): any[] {
  const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
  const activeId = store?.activeProfileId != null ? String(store.activeProfileId) : null;
  const active = activeId ? profiles.find((p: any) => String(p?.id) === activeId) : profiles[0];
  return active ? [{ ...active, id: String(active.id), name: nameOf(active), avatarDataUrl: avatarOf(active) }] : [{ id: "player_1", name: "Joueur 1" }];
}
function compactConfigLabel(config: LoterieConfig, player?: LoteriePlayerState | null) {
  if (config.variant === "express") return `EXPRESS · ${config.expressTarget.toUpperCase()} · ${config.cardsPerPlayer} CARTON${config.cardsPerPlayer > 1 ? "S" : ""}`;
  return `${config.volleyMode === "strict3" ? "3 DARTS" : "VOLÉE LIBRE"} · ${player ? `${player.targetMin}–${player.targetMax}` : config.level.toUpperCase()} · ${config.cardsPerPlayer} CARTON${config.cardsPerPlayer > 1 ? "S" : ""}`;
}
function panelStyle(): React.CSSProperties {
  return { borderRadius: 16, border: `1px solid ${STROKE}`, background: "linear-gradient(180deg, rgba(255,255,255,.07), rgba(5,8,16,.72))", boxShadow: "0 10px 22px rgba(0,0,0,.24)", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" };
}
function MiniKpi({ label, value, color = GOLD }: any) {
  return <div style={{ padding: "6px 4px", borderRadius: 12, textAlign: "center", background: "rgba(255,255,255,.045)", border: `1px solid ${STROKE}`, minWidth: 0 }}><div style={{ color: SOFT, fontSize: 8.2, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div><div style={{ color, fontSize: 14.5, fontWeight: 1000, marginTop: 2, lineHeight: 1 }}>{value}</div></div>;
}

function RulesContent({ config }: any) {
  return (
    <div style={{ display: "grid", gap: 11, fontSize: 13, lineHeight: 1.45 }}>
      {config.variant === "classic" ? <div><strong style={{ color: GOLD }}>TOTAL DE VOLÉE</strong><br />Le total des {config.volleyMode === "strict3" ? "3 fléchettes" : "1 à 3 fléchettes"} est recherché sur tous les cartons. Toutes les occurrences correspondantes sont révélées.</div> : <div><strong style={{ color: PINK }}>EXPRESS</strong><br />Une seule fléchette par tour. {config.expressTarget === "simple" ? "Le numéro 1–20 est recherché quel que soit le multiplicateur." : config.expressTarget === "double" ? "Le double exact est obligatoire, DBULL inclus." : "Le triple exact est obligatoire."}</div>}
      <div><strong style={{ color: CYAN }}>CARTONS</strong><br />Ouvre le bloc CARTONS pour afficher le carrousel. Le premier carton entièrement révélé gagne.</div>
      <div><strong style={{ color: GOOD }}>MULTI-HIT</strong><br />Si une valeur apparaît sur plusieurs cartons, une seule volée peut ouvrir plusieurs cases : DOUBLE HIT, TRIPLE HIT ou JACKPOT.</div>
    </div>
  );
}

function playerSummary(p: LoteriePlayerState, winnerId: string | null) {
  const visits = p.stats.visits || 0;
  const best = bestCardProgress(p);
  return {
    id: p.id, playerId: p.id, profileId: p.id, name: p.name, avatarDataUrl: avatarOf(p),
    win: p.id === winnerId, winner: p.id === winnerId, rank: p.id === winnerId ? 1 : 2,
    score: p.stats.cellsRevealed, points: p.stats.cellsRevealed, cardsCount: p.cards.length,
    cardsCompleted: p.stats.cardsCompleted, bestCardProgress: best, cellsPerCard: p.cards[0]?.cells?.length || 0,
    cellsRevealed: p.stats.cellsRevealed, visits, dartsThrown: p.stats.dartsThrown,
    successfulVisits: p.stats.successfulVisits, emptyVisits: p.stats.emptyVisits,
    hitCount: p.stats.successfulVisits, hits: p.stats.successfulVisits, misses: p.stats.emptyVisits,
    hitRate: visits ? p.stats.successfulVisits / visits : 0, multiHits: p.stats.multiHits,
    maxCellsInVisit: p.stats.maxCellsInVisit, bestStreak: p.stats.bestStreak,
    totalVolleyScore: p.stats.totalVolleyScore, averageVolley: visits ? p.stats.totalVolleyScore / visits : 0,
    maxVolley: p.stats.maxVolley, completedOnVisit: p.stats.completedOnVisit,
    targetMin: p.targetMin, targetMax: p.targetMax,
    isTeam: Boolean((p as any).isTeam), memberIds: (p as any).memberIds || [],
    cards: p.cards.map((c) => ({ id: c.id, progress: cardProgress(c), total: c.cells.length, cells: c.cells.map((x) => ({ key: x.key, value: x.value, label: x.label, revealed: x.revealed })) })),
  };
}

function ScratchCell({ cell, idx, recent }: any) {
  const covered = !cell?.revealed;
  return (
    <div style={{ position: "relative", minHeight: 76, animation: recent ? "lotScratchReveal .55s ease both" : undefined }}>
      <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", width: 25, height: 25, borderRadius: "50%", background: "#15120d", color: "#f8edd0", border: "2px solid #c79c3d", display: "grid", placeItems: "center", fontWeight: 1000, fontSize: 9, zIndex: 2, boxShadow: recent ? "0 0 0 4px rgba(246,194,86,.14)" : "0 3px 10px rgba(0,0,0,.18)" }}>{idx + 1}</div>
      <div style={{ height: "100%", borderRadius: 13, border: `1px solid ${covered ? "#b8954b" : "#b79147"}`, background: covered ? `linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.04)), url(${scratchCellTexture}) center/cover no-repeat, linear-gradient(145deg,#c9c7c4,#a9adb1 45%,#90969c)` : "linear-gradient(180deg,#f6eacb,#ead8ae)", boxShadow: covered ? "inset 0 2px 0 rgba(255,255,255,.18), inset 0 -8px 14px rgba(0,0,0,.08), 0 3px 8px rgba(0,0,0,.08)" : (recent ? "0 0 0 2px rgba(246,194,86,.24), 0 8px 18px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.34)" : "inset 0 1px 0 rgba(255,255,255,.34), 0 3px 8px rgba(0,0,0,.06)"), overflow: "hidden", display: "grid", placeItems: "center", position: "relative", padding: 6 }}>
        {covered ? <><div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,.14), transparent 35%, rgba(0,0,0,.08) 100%)", mixBlendMode: "screen" }} /><div style={{ position: "absolute", inset: 2, borderRadius: 11, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }} /></> : <><div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 25%,rgba(255,255,255,.16),transparent 40%), radial-gradient(circle at 70% 78%,rgba(0,0,0,.05),transparent 36%)" }} />{recent ? <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent)", animation: "lotCardShine .7s ease .08s both" }} /> : null}<div style={{ color: "#20160c", fontWeight: 1000, fontSize: cell.label.length > 4 ? 17 : 26, lineHeight: 1, whiteSpace: "nowrap", textShadow: "0 1px 0 rgba(255,255,255,.18)" }}>{cell.label}</div><div style={{ position: "absolute", right: 4, bottom: 4, transform: "rotate(-8deg)", padding: "2px 6px", borderRadius: 999, border: `1px solid ${idx % 3 === 0 ? "#b8322b" : "#b98a1f"}`, color: idx % 3 === 0 ? "#b8322b" : "#a87816", background: "rgba(255,255,255,.44)", fontSize: 7.4, fontWeight: 1000, whiteSpace: "nowrap", boxShadow: "0 2px 5px rgba(0,0,0,.08)", animation: recent ? "lotStampPop .48s ease .12s both" : undefined }}>{idx % 3 === 0 ? "VALIDÉ" : "✓ VALIDÉ"}</div></>}
      </div>
    </div>
  );
}

function TicketCard({ card, index, player, recentRevealKeys, lastVolleyText, onOpenHistory }: any) {
  const progress = cardProgress(card);
  const complete = progress === card.cells.length;
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 540, margin: "0 auto", borderRadius: 28, padding: "14px 12px 13px", border: `2px solid ${complete ? "#8f7b3c" : "#c39b45"}`, background: "linear-gradient(180deg,#f1e3c2,#e7d4a6 62%,#dcc38f)", color: "#20160b", boxShadow: "0 24px 70px rgba(0,0,0,.46), inset 0 0 0 1px rgba(93,56,18,.12)", overflow: "hidden", boxSizing: "border-box" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 20% 15%, rgba(255,255,255,.18), transparent 24%), radial-gradient(circle at 80% 88%, rgba(0,0,0,.05), transparent 26%), repeating-linear-gradient(0deg, rgba(86,61,22,.028) 0 2px, transparent 2px 7px), repeating-linear-gradient(90deg, rgba(86,61,22,.022) 0 3px, transparent 3px 9px)" }} />
      <img src={scratchTicketPreview} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .03, filter: "grayscale(1) sepia(.55) saturate(.55)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 6, borderRadius: 22, border: "1px solid rgba(123,87,27,.18)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.16), inset 0 0 25px rgba(123,87,27,.04)" }} />
      <div style={{ position: "absolute", left: 10, right: 10, top: -1, height: 11, background: "radial-gradient(circle at 6px 7px, transparent 0 6px, rgba(255,255,255,.65) 6px 7px, transparent 7px 100%) 0 0/28px 11px repeat-x" }} />
      <div style={{ position: "relative" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "clamp(29px,8vw,42px)", lineHeight: .98, fontWeight: 1000, color: "#4b2f12", letterSpacing: 1, textShadow: "0 1px 0 rgba(255,255,255,.22)" }}>LOTERIE</div>
          <div style={{ display: "inline-block", marginTop: 6, borderRadius: 999, padding: "5px 12px", background: "linear-gradient(180deg,#ff7f57,#ff5737)", color: "#fff5df", fontSize: 10.5, fontWeight: 1000, boxShadow: "0 8px 16px rgba(170,58,24,.18)" }}>{(player as any)?.isTeam ? "Carton équipe" : "Carton joueur"} · {index + 1}/{player.cards.length}</div>
          <div style={{ marginTop: 10, fontSize: 9.5, fontWeight: 1000, lineHeight: 1.25, color: "#4f3719" }}>DÉCOUVREZ LES CIBLES ET COMPLÉTEZ VOTRE CARTON</div>
        </div>

        <div style={{ marginTop: 13, display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 8 }}>
          {card.cells.map((cell: any, idx: number) => <ScratchCell key={cell.key} cell={cell} idx={idx} recent={recentRevealKeys?.includes(`${card.id}:${cell.key}`)} />)}
        </div>

        <div style={{ margin: "14px auto 0", width: "fit-content", maxWidth: "100%", padding: "6px 15px", borderRadius: 999, background: "#5a3d19", color: "#ffe98b", fontWeight: 1000, fontSize: 10, whiteSpace: "nowrap", boxShadow: "inset 0 1px 0 rgba(255,255,255,.12)" }}>{card.cells.length} CIBLES À DÉCOUVRIR · {progress}/{card.cells.length}</div>

        <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
          <TicketInfo label={(player as any)?.isTeam ? "ÉQUIPE" : "JOUEUR"} value={player.name} />
          <TicketInfo label="CARTON" value={`${index + 1} / ${player.cards.length}`} />
          <TicketInfo label="PROGRESSION" value={`${progress} / ${card.cells.length}`} progress={progress / Math.max(1, card.cells.length)} />
          <TicketInfo label="DERNIÈRE VOLÉE" value={lastVolleyText || "—"} small clickable onClick={onOpenHistory} sublabel="Toucher pour voir les scores" />
        </div>
        <div style={{ marginTop: 10, textAlign: "center", color: complete ? "#18784d" : "#ff5a41", fontSize: 11, fontWeight: 1000 }}>Visez juste. Complétez. Gagnez.</div>
      </div>
    </div>
  );
}
function TicketInfo({ label, value, progress, small, clickable, onClick, sublabel }: any) {
  const Tag: any = clickable ? 'button' : 'div';
  return <Tag type={clickable ? 'button' : undefined} onClick={clickable ? onClick : undefined} style={{ minWidth: 0, minHeight: 62, borderRadius: 14, border: `1px dashed ${clickable ? 'rgba(214,166,53,.55)' : 'rgba(80,51,18,.24)'}`, background: clickable ? 'rgba(255,248,232,.82)' : 'rgba(255,248,232,.72)', padding: 8, overflow: 'hidden', textAlign: 'left', cursor: clickable ? 'pointer' : 'default', boxShadow: clickable ? '0 6px 15px rgba(0,0,0,.06)' : 'none' }}><div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}><div style={{ color: '#655039', fontSize: 8, fontWeight: 1000, letterSpacing: .4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>{clickable ? <div style={{ color:'#b7871e', fontSize: 8.2, fontWeight:1000 }}>VOIR ▸</div> : null}</div><div style={{ marginTop: 5, color: '#171008', fontWeight: 1000, fontSize: small ? 11.5 : 18, lineHeight: 1.15, whiteSpace: small ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', overflowWrap: 'break-word', wordBreak: 'normal' }}>{value}</div>{sublabel ? <div style={{ marginTop: 5, color:'#8b6d46', fontSize: 8.4, fontWeight:900 }}>{sublabel}</div> : null}{typeof progress === 'number' ? <div style={{ marginTop: 7, height: 10, borderRadius: 999, background: '#2b2014', overflow: 'hidden', boxShadow:'inset 0 1px 2px rgba(255,255,255,.1)' }}><div style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%`, height: '100%', background: 'linear-gradient(90deg,#f8e52a,#e9c553 36%,#3a2e1d 36%,#3a2e1d 100%)' }} /></div> : null}</Tag>;
}

function ScoreHistoryModal({ player, config, events, onClose }: any) {
  const playerEvents = [...(events || [])].filter((e: any) => e.playerId === player?.id).reverse();
  const grouped = (wantHits: boolean) => {
    const map = new Map();
    for (const ev of playerEvents) {
      const ok = (ev?.revealed || 0) > 0;
      if (ok !== wantHits) continue;
      const label = config.variant === 'classic' ? String(ev?.volleyScore ?? ev?.resultLabel ?? 0) : String(ev?.resultLabel ?? 'MISS');
      const cur = map.get(label) || { label, count: 0, last: ev };
      cur.count += 1;
      cur.last = ev;
      map.set(label, cur);
    }
    return [...map.values()].sort((a,b)=> Number(b.count)-Number(a.count) || String(a.label).localeCompare(String(b.label), 'fr'));
  };
  const valides = grouped(true);
  const refuses = grouped(false);
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position:'fixed', inset:0, zIndex:10005, background:'rgba(0,0,0,.78)', backdropFilter:'blur(8px)', display:'grid', placeItems:'center', padding:12 }}>
      <div onClick={(e)=>e.stopPropagation()} style={{ width:'min(560px,100%)', maxHeight:'86dvh', overflowY:'auto', borderRadius:18, border:`1px solid ${GOLD}55`, background:'linear-gradient(180deg,#15120d,#0b0e13 45%,#08090c)', boxShadow:'0 26px 65px rgba(0,0,0,.55)', padding:12 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}><div><div style={{ color:GOLD, fontWeight:1000, fontSize:14 }}>SCORES JOUÉS · {player?.name}</div><div style={{ color:SOFT, fontSize:10, marginTop:2 }}>{config.variant === 'classic' ? 'Vert = score ayant ouvert au moins une case · Rouge = score refusé' : 'Historique des lancers express'}</div></div><button type='button' onClick={onClose} style={carouselBtn}>×</button></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:12 }}>
          <HistoryGroup title='VALIDÉS' color={GOOD} fill='rgba(112,239,189,.12)' items={valides} empty='Aucun score validé' />
          <HistoryGroup title='REFUSÉS' color={BAD} fill='rgba(255,113,138,.10)' items={refuses} empty='Aucun score refusé' />
        </div>
        <div style={{ marginTop:12, borderTop:'1px solid rgba(255,255,255,.07)', paddingTop:10 }}>
          <div style={{ color:SOFT, fontSize:10, fontWeight:1000, marginBottom:8 }}>DERNIÈRES VOLÉES</div>
          <div style={{ display:'grid', gap:7 }}>
            {playerEvents.slice(0,12).map((ev: any, idx: number) => {
              const ok = (ev?.revealed || 0) > 0;
              return <div key={`${ev.ts}_${idx}`} style={{ borderRadius:12, padding:'8px 10px', background:'rgba(255,255,255,.04)', border:`1px solid ${ok ? 'rgba(112,239,189,.25)' : 'rgba(255,113,138,.2)'}`, display:'grid', gridTemplateColumns:'auto 1fr auto', gap:8, alignItems:'center' }}><div style={{ width:8, height:8, borderRadius:999, background: ok ? GOOD : BAD }} /><div style={{ minWidth:0 }}><div style={{ color:'#fff', fontSize:11.5, fontWeight:1000, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{config.variant === 'classic' ? `${ev?.darts?.map((d:any)=>d.label).join(' + ')} = ${ev?.volleyScore}` : (ev?.darts?.[0]?.label || ev?.resultLabel || 'MISS')}</div><div style={{ marginTop:2, color:SOFT, fontSize:9 }}>{ok ? `${ev?.revealed || 0} case${(ev?.revealed || 0) > 1 ? 's' : ''} ouverte${(ev?.revealed || 0) > 1 ? 's' : ''}` : 'Aucune case'}</div></div><div style={{ color: ok ? GOOD : BAD, fontSize:10, fontWeight:1000 }}>{ok ? 'VALIDÉ' : 'REFUSÉ'}</div></div>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
function HistoryGroup({ title, color, fill, items, empty }: any) {
  return <div style={{ borderRadius:14, padding:10, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)' }}><div style={{ color, fontSize:11, fontWeight:1000, letterSpacing:.6 }}>{title}</div><div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:10 }}>{items.length ? items.map((it:any)=><div key={it.label} style={{ minWidth:64, padding:'8px 10px', borderRadius:12, background:fill, border:`1px solid ${color}55`, boxShadow:'inset 0 1px 0 rgba(255,255,255,.05)' }}><div style={{ color:'#fff', fontSize:14, fontWeight:1000, textAlign:'center' }}>{it.label}</div><div style={{ marginTop:3, color, fontSize:9, fontWeight:1000, textAlign:'center' }}>× {it.count}</div></div>) : <div style={{ color:SOFT, fontSize:10 }}>{empty}</div>}</div></div>;
}

function FloatingCardsModal({ player, initialIndex, onClose, recentRevealKeys, lastVolleyText, onOpenHistory }: any) {
  const [index, setIndex] = React.useState(Math.max(0, Math.min(Number(initialIndex) || 0, player.cards.length - 1)));
  React.useEffect(() => setIndex(Math.max(0, Math.min(Number(initialIndex) || 0, player.cards.length - 1))), [initialIndex, player.id]);
  const prev = () => setIndex((i) => (i - 1 + player.cards.length) % player.cards.length);
  const next = () => setIndex((i) => (i + 1) % player.cards.length);
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.76)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 10px calc(12px + var(--safe-bottom))" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(620px,100%)", maxHeight: "92dvh", overflowY: "auto", position: "relative" }} className="dc-scroll-thin">
        <div style={{ position: "sticky", top: 0, zIndex: 4, display: "grid", gridTemplateColumns: "42px 1fr 42px", alignItems: "center", gap: 8, marginBottom: 8, padding: "5px 4px", borderRadius: 16, background: "rgba(8,10,16,.92)", border: `1px solid ${GOLD}33` }}>
          <button type="button" onClick={prev} disabled={player.cards.length <= 1} style={carouselBtn}>‹</button>
          <div style={{ minWidth: 0, textAlign: "center" }}><div style={{ color: GOLD, fontSize: 12, fontWeight: 1000, letterSpacing: .8 }}>CARTONS · {nameOf(player)}</div><div style={{ marginTop: 1, color: SOFT, fontSize: 9.5 }}>Carton {index + 1}/{player.cards.length} · glisse avec les flèches</div></div>
          <button type="button" onClick={onClose} style={{ ...carouselBtn, color: "#fff" }}>×</button>
        </div>
        <TicketCard card={player.cards[index]} index={index} player={player} recentRevealKeys={recentRevealKeys} lastVolleyText={lastVolleyText} onOpenHistory={onOpenHistory} />
        {player.cards.length > 1 ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 9 }}><button type="button" onClick={prev} style={carouselWideBtn}>← PRÉCÉDENT</button><div style={{ display: "flex", gap: 5 }}>{player.cards.map((c: any, i: number) => <button key={c.id} type="button" onClick={() => setIndex(i)} aria-label={`Carton ${i + 1}`} style={{ width: i === index ? 20 : 8, height: 8, borderRadius: 999, border: "none", background: i === index ? GOLD : "rgba(255,255,255,.25)", transition: "width .15s ease", cursor: "pointer" }} />)}</div><button type="button" onClick={next} style={carouselWideBtn}>SUIVANT →</button></div> : null}
      </div>
    </div>
  );
}
const carouselBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: 999, border: `1px solid ${GOLD}66`, background: "rgba(255,255,255,.05)", color: GOLD, fontSize: 22, fontWeight: 1000, cursor: "pointer" };
const carouselWideBtn: React.CSSProperties = { minHeight: 34, borderRadius: 999, border: `1px solid ${GOLD}55`, background: "rgba(246,194,86,.08)", color: GOLD, padding: "0 10px", fontSize: 8.5, fontWeight: 1000, cursor: "pointer" };

function randomBotDart(bot: any): LoterieDart {
  const avg = Math.max(15, Math.min(105, Number(bot?.avg3 || bot?.avg3D || 35) || 35));
  const quality = Math.max(.16, Math.min(.82, avg / 115));
  if (Math.random() < .08 + (1 - quality) * .1) return { v: 0, mult: 1 } as any;
  if (Math.random() < .06 + quality * .05) return { v: 25, mult: Math.random() < quality * .3 ? 2 : 1 } as any;
  const v = 1 + Math.floor(Math.random() * 20);
  const roll = Math.random();
  const mult = roll < quality * .18 ? 3 : roll < quality * .4 ? 2 : 1;
  return { v, mult } as any;
}

export default function LoteriePlay({ setTab, go, store, params, onFinish }: any) {
  const { theme } = useTheme();
  const config: LoterieConfig & any = { ...DEFAULT_CONFIG, ...(params?.config || {}) };
  const sourcePlayers = Array.isArray(params?.players) && params.players.length ? params.players : makeFallbackPlayers(store);
  const createdAtRef = React.useRef(Number(params?.createdAt) || Date.now());
  const [seed, setSeed] = React.useState(() => Date.now());
  const [players, setPlayers] = React.useState<LoteriePlayerState[]>(() => buildPlayerStates(sourcePlayers, config, seed));
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [darts, setDarts] = React.useState<LoterieDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [toast, setToast] = React.useState<any>(null);
  const [winnerId, setWinnerId] = React.useState<string | null>(null);
  const [events, setEvents] = React.useState<any[]>([]);
  const [recentRevealKeys, setRecentRevealKeys] = React.useState<string[]>([]);
  const [fx, setFx] = React.useState<any>(null);
  const [cardsOpen, setCardsOpen] = React.useState(false);
  const [cardsInitialIndex, setCardsInitialIndex] = React.useState(0);
  const [rankingOpen, setRankingOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [botThinking, setBotThinking] = React.useState(false);
  const finishSent = React.useRef(false);

  const active = players[activeIndex] || players[0];
  const winner = winnerId ? players.find((p) => p.id === winnerId) || null : null;
  const ranking = React.useMemo(() => [...players].sort((a, b) => bestCardProgress(b) - bestCardProgress(a) || b.stats.cellsRevealed - a.stats.cellsRevealed), [players]);
  const bestIdx = active?.cards?.length ? active.cards.reduce((bestI, c, i, arr) => cardProgress(c) > cardProgress(arr[bestI]) ? i : bestI, 0) : 0;
  const bestProgress = active ? bestCardProgress(active) : 0;
  const cardTotal = active?.cards?.[0]?.cells?.length || config.cellsPerCard;
  const lastPlayerEvent = React.useMemo(() => [...events].reverse().find((e: any) => e.playerId === active?.id) || null, [events, active?.id]);
  const lastVolleyText = config.variant === "classic"
    ? (darts.length ? `${darts.map((d: any) => dartLabel(d)).join(" + ")} = ${volleyScore(darts)}` : (lastPlayerEvent?.darts?.length ? `${lastPlayerEvent.darts.map((d: any) => d.label).join(" + ")} = ${lastPlayerEvent.volleyScore}` : "—"))
    : (darts[0] ? dartLabel(darts[0]) : (lastPlayerEvent?.darts?.[0]?.label || "—"));

  React.useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 1500);
    return () => window.clearTimeout(id);
  }, [toast]);
  React.useEffect(() => {
    if (!recentRevealKeys.length) return;
    const id = window.setTimeout(() => setRecentRevealKeys([]), 1200);
    return () => window.clearTimeout(id);
  }, [recentRevealKeys]);
  React.useEffect(() => {
    if (!fx) return;
    const id = window.setTimeout(() => setFx(null), 1200);
    return () => window.clearTimeout(id);
  }, [fx]);

  React.useEffect(() => {
    if (!active || winnerId || !isBotLike(active) || botThinking) return;
    let cancelled = false;
    setBotThinking(true);
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const turn = config.variant === "express" ? [randomBotDart(active)] : Array.from({ length: config.volleyMode === "strict3" ? 3 : 1 + Math.floor(Math.random() * 3) }, () => randomBotDart(active));
      commitTurn(turn);
      setBotThinking(false);
    }, 720);
    return () => { cancelled = true; window.clearTimeout(timer); setBotThinking(false); };
  }, [activeIndex, winnerId, active?.id, events.length]);

  function finish(finalPlayers: LoteriePlayerState[], winId: string, finalEvents: any[]) {
    if (finishSent.current) return;
    finishSent.current = true;
    setWinnerId(winId);
    const finishedAt = Date.now();
    const summaries = finalPlayers.map((p) => playerSummary(p, winId));
    const win = finalPlayers.find((p) => p.id === winId);
    const record = {
      id: `loterie_${createdAtRef.current}_${Math.random().toString(36).slice(2, 8)}`,
      kind: "loterie", mode: "loterie", variant: config.variant, status: "finished",
      players: summaries, winnerId: winId, winnerName: win?.name || "", createdAt: createdAtRef.current,
      updatedAt: finishedAt, finishedAt,
      summary: { kind: "loterie", mode: "loterie", variant: config.variant, winnerId: winId, winnerName: win?.name || "", config, players: summaries, perPlayer: summaries, rankings: summaries },
      payload: { kind: "loterie", mode: "loterie", gameId: "loterie", config, stats: { mode: "loterie", variant: config.variant, players: summaries }, summary: { mode: "loterie", variant: config.variant, winnerId: winId, winnerName: win?.name || "", players: summaries, perPlayer: summaries }, events: finalEvents },
    };
    try { onFinish?.(record); } catch (e) { console.warn("[Loterie] onFinish failed", e); }
  }

  function commitTurn(turnDarts: LoterieDart[]) {
    if (!active || winnerId || !turnDarts.length) return;
    const current = players[activeIndex];
    const resolved = revealResult(current, config, turnDarts);
    const nextPlayers = players.map((p, i) => i === activeIndex ? resolved.player : p);
    const didWin = hasWon(resolved.player);
    const changedKeys = resolved.player.cards.flatMap((card: any, cardIdx: number) => {
      const prevCard = current.cards[cardIdx];
      return card.cells.filter((cell: any, ci: number) => cell.revealed && !prevCard?.cells?.[ci]?.revealed).map((cell: any) => `${card.id}:${cell.key}`);
    });
    const ev = { ts: Date.now(), playerId: current.id, playerName: current.name, darts: turnDarts.map((d) => ({ ...d, label: dartLabel(d), score: dartScore(d) })), volleyScore: volleyScore(turnDarts), resultKey: resolved.result.key, resultLabel: resolved.result.label, revealed: resolved.revealed, completedCardIds: resolved.completedCardIds };
    const nextEvents = [...events, ev];
    setEvents(nextEvents);
    setPlayers(nextPlayers);
    setDarts([]);
    setRecentRevealKeys(changedKeys);
    const hitLabel = resolved.revealed >= 3 ? `🎰 JACKPOT · ${resolved.revealed} CASES !` : resolved.revealed === 2 ? "✨ DOUBLE HIT · 2 CASES !" : resolved.revealed === 1 ? "✅ TROUVÉ · 1 CASE !" : `❌ ${resolved.result.label || "0"} · AUCUNE CASE`;
    setToast({ good: resolved.revealed > 0, text: hitLabel });
    setFx({ text: hitLabel, tone: resolved.revealed >= 2 ? "gold" : resolved.revealed === 1 ? "green" : "red" });
    if (didWin) {
      finish(nextPlayers, current.id, nextEvents);
      return;
    }
    setActiveIndex((activeIndex + 1) % nextPlayers.length);
  }

  function addDart(value: number, forcedMult?: number) {
    if (winnerId || botThinking) return;
    const mult = value === 0 ? 1 : (forcedMult || multiplier);
    const dart: LoterieDart = { v: Number(value) || 0, mult: mult as any };
    if (config.variant === "express") {
      setDarts([dart]);
      window.setTimeout(() => commitTurn([dart]), 70);
      return;
    }
    if (darts.length >= 3) return;
    const next = [...darts, dart];
    setDarts(next);
    if (config.volleyMode === "strict3" && next.length === 3) window.setTimeout(() => commitTurn(next), 70);
  }
  function validateVisit() {
    if (winnerId || botThinking || !darts.length) return;
    if (config.variant === "express") return;
    if (config.volleyMode === "strict3" && darts.length !== 3) return;
    commitTurn(darts);
  }
  function cancelInput() {
    if (botThinking || winnerId) return;
    setDarts((previous) => previous.slice(0, -1));
  }
  function resetGame() {
    const nextSeed = Date.now();
    setSeed(nextSeed);
    setPlayers(buildPlayerStates(sourcePlayers, config, nextSeed));
    setActiveIndex(0); setDarts([]); setWinnerId(null); setEvents([]); setRecentRevealKeys([]); setFx(null); setToast(null); setCardsOpen(false); setRankingOpen(false); setBotThinking(false);
    finishSent.current = false;
    createdAtRef.current = Date.now();
  }
  function backToConfig() {
    (go || setTab)?.("loterie_config");
  }
  function openCards(index = bestIdx) {
    setCardsInitialIndex(index);
    setCardsOpen(true);
  }

  const activeAvatarProfile = active ? { ...active, avatarDataUrl: avatarOf(active), avatarUrl: avatarOf(active) } : null;
  const accent = (active as any)?.color || GOLD;

  return (
    <div style={{ minHeight: "100dvh", color: theme?.text || "#fff", background: `radial-gradient(circle at 50% -5%, ${GOLD}20 0, ${theme?.bg || "#080c17"} 46%, #020309 100%)`, paddingBottom: 8, overflowX: "hidden" }}>
      <style>{`
        @keyframes lotScratchReveal { 0% { transform: scale(.86) rotate(-4deg); filter: brightness(1.15);} 55% { transform: scale(1.04) rotate(1deg);} 100% { transform: scale(1) rotate(0deg); filter: brightness(1);} }
        @keyframes lotStampPop { 0% { opacity: 0; transform: scale(.35) rotate(-20deg);} 75% { opacity: 1; transform: scale(1.12) rotate(-8deg);} 100% { opacity: 1; transform: scale(1) rotate(-8deg);} }
        @keyframes lotFxBurst { 0% { opacity: 0; transform: translate(-50%,-30%) scale(.72);} 12% { opacity: 1;} 100% { opacity: 0; transform: translate(-50%,-54%) scale(1.08);} }
      `}</style>
      <PageHeader
        tickerSrc={tickerLoterie}
        tickerAlt="LOTERIE"
        tickerHeight={92}
        tickerFit="cover"
        tickerBottomGap={10}
        left={<div style={{ marginLeft: 6 }}><BackDot onClick={backToConfig} color={GOLD} glow={`${GOLD}88`} title="Retour à la configuration" /></div>}
        right={<div style={{ marginRight: 6 }}><InfoDot title="Règles LOTERIE" color={PINK} glow={`${PINK}77`} content={<RulesContent config={config} />} /></div>}
      />

      <div style={{ padding: "8px 8px 8px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <section style={{ ...panelStyle(), marginBottom: 7, padding: 0, overflow: "hidden", borderColor: `${accent}88`, boxShadow: `0 0 24px ${accent}20` }}>
          <div style={{ position: "relative", minHeight: 126, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(126px,138px)", gap: 4, alignItems: "stretch", padding: "8px 10px" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.36), rgba(0,0,0,.18) 36%, rgba(0,0,0,.10) 62%, rgba(0,0,0,.30))" }} />
            <div style={{ position: "absolute", left: -20, top: -4, bottom: -4, width: "24%", minWidth: 82, overflow: "hidden", opacity: .15, pointerEvents: "none" }}>
              <div style={{ position: "absolute", left: -16, top: 16, transform: "scale(1.22)", transformOrigin: "left top", filter: "saturate(.86)" }}>{activeAvatarProfile ? <ProfileAvatar profile={activeAvatarProfile as any} size={82} /> : null}</div>
            </div>
            <div style={{ gridColumn: "1 / 2", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 0, textAlign: "center", padding: "2px 10px 2px 6px" }}>
              {botThinking ? <div style={{ color: accent, fontSize: 10.5, fontWeight: 1000, letterSpacing: 1, marginBottom: 2 }}>BOT EN RÉFLEXION</div> : null}
              <div style={{ color: accent, fontSize: 14, fontWeight: 1000, letterSpacing: .8, lineHeight: 1.02, maxWidth: "100%", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameOf(active)}</div>
              <div style={{ marginTop: 6, color: "#ffcf57", fontSize: 55, fontWeight: 900, lineHeight: 1.02, textShadow: "0 4px 18px rgba(255,195,26,.25)", whiteSpace: "nowrap" }}>{bestProgress}<span style={{ fontSize: 25, opacity: .62 }}>/{cardTotal}</span></div>
              <div style={{ marginTop: 3, color: SOFT, fontSize: 8.5, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{compactConfigLabel(config, active)}</div>
            </div>
            <button type="button" onClick={() => openCards(bestIdx)} style={{ gridColumn: "2 / 3", position: "relative", zIndex: 2, minWidth: 0, overflow: "hidden", borderRadius: 18, border: `1px solid ${GOLD}44`, background: "#080b12", cursor: "pointer", padding: 0, color: "#fff" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(180deg, rgba(4,8,16,.32), rgba(4,8,16,.78)), url(${scratchTicketPreview})`, backgroundPosition: "center", backgroundSize: "cover", opacity: .72 }} />
              <div style={{ position: "relative", display: "flex", height: "100%", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6px 4px" }}>
                <div style={{ color: SOFT, fontSize: 9.5, fontWeight: 950 }}>MEILLEUR CARTON</div>
                <div style={{ color: GOLD, fontSize: 28, lineHeight: 1, fontWeight: 1100, marginTop: 5 }}>C{bestIdx + 1}</div>
                <div style={{ color: "rgba(255,255,255,.82)", fontSize: 13, fontWeight: 1000, marginTop: 5 }}>{bestProgress}/{cardTotal}</div>
                <div style={{ color: SOFT, fontSize: 8, marginTop: 5 }}>TOUCHER POUR OUVRIR</div>
              </div>
            </button>
          </div>
        </section>

        <section style={{ ...panelStyle(), padding: 8, marginBottom: 7 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4 }}>
            <MiniKpi label="CASES" value={active?.stats?.cellsRevealed || 0} color={GOLD} />
            <MiniKpi label="TOURS" value={active?.stats?.visits || 0} color={CYAN} />
            <MiniKpi label="HITS" value={active?.stats?.successfulVisits || 0} color={GOOD} />
            <MiniKpi label="MULTI" value={active?.stats?.multiHits || 0} color={PINK} />
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 7 }}>
          <button type="button" onClick={() => openCards(bestIdx)} style={{ ...panelStyle(), minHeight: 76, padding: "8px 10px", cursor: "pointer", color: "#fff", textAlign: "left", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><span style={{ color: GOLD, fontSize: 10, fontWeight: 1000, letterSpacing: .7 }}>🎟️ CARTONS</span><span style={{ color: SOFT, fontSize: 9 }}>OUVRIR ›</span></div>
            <div style={{ display: "flex", gap: 5, marginTop: 8, overflow: "hidden" }}>{active?.cards?.map((card: any, i: number) => <span key={card.id} style={{ flex: "1 1 0", minWidth: 0, textAlign: "center", padding: "5px 3px", borderRadius: 999, border: `1px solid ${i === bestIdx ? GOLD + "66" : "rgba(255,255,255,.09)"}`, color: i === bestIdx ? GOLD : SOFT, fontSize: 8.5, fontWeight: 1000, whiteSpace: "nowrap" }}>C{i + 1} {cardProgress(card)}/{card.cells.length}</span>)}</div>
          </button>
          <button type="button" onClick={() => setRankingOpen(true)} style={{ ...panelStyle(), minHeight: 76, padding: "8px 10px", cursor: "pointer", color: "#fff", textAlign: "left", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><span style={{ color: CYAN, fontSize: 10, fontWeight: 1000, letterSpacing: .7 }}>🏆 CLASSEMENT</span><span style={{ color: SOFT, fontSize: 9 }}>DÉTAIL ›</span></div>
            <div style={{ marginTop: 7, display: "grid", gap: 3 }}>{ranking.slice(0, 2).map((p, i) => <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, minWidth: 0 }}><span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 9.5, fontWeight: 900 }}>{i + 1}. {p.name}</span><span style={{ flex: "0 0 auto", color: p.id === active?.id ? GOLD : SOFT, fontSize: 9, fontWeight: 1000 }}>{bestCardProgress(p)}/{p.cards[0]?.cells?.length || config.cellsPerCard}</span></div>)}</div>
          </button>
        </section>

        <section style={{ ...panelStyle(), padding: 8 }}>
          <div style={{ opacity: botThinking ? .45 : 1, pointerEvents: botThinking || !!winnerId ? "none" : "auto" }}>
            <Keypad
              currentThrow={darts as any}
              multiplier={multiplier}
              onSimple={() => setMultiplier(1)}
              onDouble={() => setMultiplier(2)}
              onTriple={() => setMultiplier(3)}
              onBackspace={cancelInput}
              onCancel={cancelInput}
              onNumber={(number) => addDart(number)}
              onBull={() => addDart(25, multiplier === 2 ? 2 : 1)}
              onValidate={validateVisit}
              hidePreview={false}
              centerSlot={<span style={{ display: "inline-block", minWidth: 58, textAlign: "center", padding: "8px 14px", borderRadius: 14, background: "rgba(255,187,51,.12)", border: "1px solid rgba(255,187,51,.4)", color: "#ffc63a", fontWeight: 900, fontSize: 22, lineHeight: 1, boxShadow: "0 0 16px rgba(255,170,0,.22)" }}>{config.variant === "classic" ? volleyScore(darts) : (darts[0] ? dartLabel(darts[0]) : 0)}</span>}
              noticeSlot={config.variant === "classic" ? <span style={{ color: SOFT, fontSize: 9, fontWeight: 900 }}>{config.volleyMode === "strict3" ? "3 DARTS OBLIGATOIRES · validation automatique à la 3e" : "VOLÉE LIBRE · VALIDER après 1, 2 ou 3 darts"}</span> : <span style={{ color: PINK, fontSize: 9, fontWeight: 900 }}>EXPRESS · 1 DART · validation automatique</span>}
            />
          </div>
        </section>
      </div>

      {cardsOpen && active ? <FloatingCardsModal player={active} initialIndex={cardsInitialIndex} onClose={() => setCardsOpen(false)} recentRevealKeys={recentRevealKeys} lastVolleyText={lastVolleyText} onOpenHistory={openHistory} /> : null}
      {historyOpen && active ? <ScoreHistoryModal player={active} config={config} events={events} onClose={() => setHistoryOpen(false)} /> : null}

      {rankingOpen ? <div role="dialog" aria-modal="true" onClick={() => setRankingOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.72)", backdropFilter: "blur(7px)", display: "grid", placeItems: "center", padding: 14 }}><div onClick={(e) => e.stopPropagation()} style={{ ...panelStyle(), width: "min(520px,100%)", maxHeight: "78dvh", overflowY: "auto", padding: 13, borderColor: `${CYAN}55` }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><div style={{ color: CYAN, fontWeight: 1000, letterSpacing: .8 }}>CLASSEMENT LOTERIE</div><button type="button" onClick={() => setRankingOpen(false)} style={carouselBtn}>×</button></div><div style={{ display: "grid", gap: 7, marginTop: 10 }}>{ranking.map((p, i) => <div key={p.id} style={{ display: "grid", gridTemplateColumns: "32px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 13, background: p.id === active?.id ? "rgba(246,194,86,.08)" : "rgba(255,255,255,.035)", border: `1px solid ${p.id === active?.id ? GOLD + "55" : "rgba(255,255,255,.07)"}` }}><div style={{ color: i === 0 ? GOLD : SOFT, fontSize: 16, fontWeight: 1000, textAlign: "center" }}>{i + 1}</div><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div><div style={{ marginTop: 2, color: SOFT, fontSize: 9 }}>{p.stats.cellsRevealed} cases · {p.stats.visits} tours</div></div><div style={{ color: GOLD, fontSize: 18, fontWeight: 1000 }}>{bestCardProgress(p)}/{p.cards[0]?.cells?.length || config.cellsPerCard}</div></div>)}</div></div></div> : null}

      {fx ? <div style={{ position: "fixed", left: "50%", top: "45%", transform: "translate(-50%,-50%)", zIndex: 10020, pointerEvents: "none", animation: "lotFxBurst 1.15s ease-out both", textAlign: "center", padding: "12px 20px", borderRadius: 18, border: `1px solid ${fx.tone === "red" ? BAD : fx.tone === "green" ? GOOD : GOLD}`, background: "rgba(10,10,12,.9)", color: fx.tone === "red" ? BAD : fx.tone === "green" ? GOOD : GOLD, fontWeight: 1000, fontSize: 20, letterSpacing: .7, boxShadow: "0 16px 45px rgba(0,0,0,.42)" }}>{fx.text}</div> : null}
      {toast ? <div style={{ position: "fixed", left: "50%", top: 104, transform: "translateX(-50%)", zIndex: 120, minWidth: "min(360px,88vw)", textAlign: "center", padding: "10px 14px", borderRadius: 16, border: `1px solid ${toast.good ? GOOD : BAD}90`, background: "rgba(9,10,13,.96)", color: toast.good ? GOOD : BAD, fontWeight: 1000, fontSize: 11.5, boxShadow: "0 12px 35px rgba(0,0,0,.4)" }}>{toast.text}</div> : null}

      {winner ? <div style={{ position: "fixed", inset: 0, zIndex: 10030, background: "rgba(0,0,0,.84)", display: "grid", placeItems: "center", padding: 16 }}><div style={{ width: "min(520px,96vw)", maxHeight: "90dvh", overflowY: "auto", borderRadius: 23, border: `1px solid ${GOLD}80`, background: "linear-gradient(180deg,#17130b,#0b0c10 38%,#07080b)", padding: 18, textAlign: "center", boxShadow: "0 30px 90px rgba(0,0,0,.65)" }}><div style={{ fontSize: 42 }}>🏆</div><div style={{ color: GOLD, fontSize: 12, fontWeight: 1000, letterSpacing: 1.7 }}>JACKPOT — CARTON COMPLET</div><div style={{ marginTop: 5, fontSize: 25, fontWeight: 1000 }}>{winner.name}</div><div style={{ marginTop: 5, color: SOFT, fontSize: 11 }}>{winner.stats.completedOnVisit} tours · {winner.stats.dartsThrown} darts · {winner.stats.cellsRevealed} cases révélées</div><div style={{ marginTop: 13, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 7 }}>{[["Taux découverte", winner.stats.visits ? `${Math.round((winner.stats.successfulVisits / winner.stats.visits) * 100)}%` : "0%"], ["Multi-hits", winner.stats.multiHits], ["Meilleur hit", `${winner.stats.maxCellsInVisit} case${winner.stats.maxCellsInVisit > 1 ? "s" : ""}`], ["Meilleure série", winner.stats.bestStreak], ["Volée moyenne", winner.stats.visits ? (winner.stats.totalVolleyScore / winner.stats.visits).toFixed(1) : "0"], ["Meilleure volée", winner.stats.maxVolley]].map(([l, v]: any) => <div key={l} style={{ padding: 10, borderRadius: 13, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ color: SOFT, fontSize: 8.5 }}>{l}</div><div style={{ marginTop: 2, color: GOLD, fontSize: 18, fontWeight: 1000 }}>{v}</div></div>)}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 14 }}><button onClick={resetGame} style={{ minHeight: 45, borderRadius: 13, border: `1px solid ${GOLD}`, background: "rgba(246,194,86,.12)", color: GOLD, fontWeight: 1000 }}>REJOUER</button><button onClick={() => (go || setTab)?.("statsHub", { initialPlayerId: winner.id, initialStatsSubTab: "loterie" })} style={{ minHeight: 45, borderRadius: 13, border: `1px solid ${CYAN}70`, background: "rgba(69,216,255,.08)", color: CYAN, fontWeight: 1000 }}>STATS</button><button onClick={() => (go || setTab)?.("games")} style={{ minHeight: 45, borderRadius: 13, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontWeight: 1000 }}>MENU</button></div></div></div> : null}
    </div>
  );
}
