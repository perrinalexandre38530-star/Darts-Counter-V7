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
import { useLang } from "../contexts/LangContext";
import { playGolfTickerSound } from "../lib/sfx";
import tickerLoterie from "../assets/tickers/ticker_loterie.png";
import victoryImage from "../assets/victory.webp";
import scratchTicketPreview from "../assets-webp/games/loterie-ticket-scratch-v2.png";
import bestCardBackgroundClassic from "../assets-webp/games/loterie-best-card-bg-classic.webp";
import bestCardBackgroundSimple from "../assets-webp/games/loterie-best-card-bg-simple.png";
import bestCardBackgroundDouble from "../assets-webp/games/loterie-best-card-bg-double.png";
import bestCardBackgroundTriple from "../assets-webp/games/loterie-best-card-bg-triple.png";
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
const SCORE_REVEAL_MS = 3200;

// Cartes de résultat 10→120. Les fichiers sont servis depuis /public afin de ne
// charger qu'une seule carte à la fin d'une volée au lieu d'embarquer les 111
// visuels dans le chunk JavaScript.
const LOTERIE_SCORE_CARD_BASE = `${import.meta.env.BASE_URL || "/"}images/loterie/score-cards/`;
const LOTERIE_SPECIAL_CARD_BASE = `${import.meta.env.BASE_URL || "/"}images/loterie/special-cards/`;
function loterieScoreCardUrl(score: number) {
  const n = Math.round(Number(score) || 0);
  return n >= 10 && n <= 120 ? `${LOTERIE_SCORE_CARD_BASE}${n}.webp` : null;
}
function loterieOutOfDrawCardUrl(lang?: string) {
  return `${LOTERIE_SPECIAL_CARD_BASE}${lang === "fr" ? "hors-lot-fr" : "out-of-draw-en"}.webp`;
}
function isHorsLoterieScore(score: number) {
  const n = Math.round(Number(score) || 0);
  return n < 10 || n > 120;
}
function loterieScoreMaterial(score: number) {
  const n = Math.round(Number(score) || 0);
  if (n >= 110) return { name: "DIAMANT", aura: "#d9f7ff" };
  if (n >= 100) return { name: "ÉMERAUDE", aura: "#24d58a" };
  if (n >= 90) return { name: "RUBIS", aura: "#ff335b" };
  if (n >= 80) return { name: "SAPHIR", aura: "#3b7cff" };
  if (n >= 70) return { name: "PLATINE", aura: "#d8e1ea" };
  if (n >= 60) return { name: "OR BLANC", aura: "#fff7d6" };
  if (n >= 50) return { name: "OR", aura: "#ffd447" };
  if (n >= 40) return { name: "ARGENT", aura: "#d7dde5" };
  if (n >= 30) return { name: "LAITON", aura: "#cfad49" };
  if (n >= 20) return { name: "CUIVRE POLI", aura: "#e17846" };
  return { name: "BRONZE VIEILLI", aura: "#b87343" };
}
// Réutilise strictement les mêmes sons que les tickers du Golf.
// - MISS pour un score refusé / non trouvé
// - PAR dès qu'au moins une case est dévoilée
function playLoterieGolfTickerSfx(found: boolean) {
  try {
    playGolfTickerSound(found ? "PAR" : "MISS", 0.95);
  } catch {}
}
const SCRATCH_CELL_TEXTURE = "data:image/webp;base64,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";

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
function MiniKpi({ label, value, color = GOLD, onClick }: any) {
  const Tag: any = onClick ? "button" : "div";
  return <Tag type={onClick ? "button" : undefined} onClick={onClick} style={{ padding: "6px 4px", borderRadius: 12, textAlign: "center", background: "rgba(255,255,255,.045)", border: `1px solid ${STROKE}`, minWidth: 0, cursor: onClick ? "pointer" : "default" }}><div style={{ color: SOFT, fontSize: 8.2, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div><div style={{ color, fontSize: 14.5, fontWeight: 1000, marginTop: 2, lineHeight: 1 }}>{value}</div></Tag>;
}
function ModeInlineInfo({ kind, value, accent }: any) {
  const icon = kind === "darts" ? (
    <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}><path d="M5 19 19 5M12.5 5H19v6.5M4.5 13.5l6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ) : kind === "range" ? (
    <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
  ) : (
    <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}><rect x="5" y="6" width="14" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M9 6v12M15 6v12" fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".8"/></svg>
  );
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "clamp(2px, .8vw, 5px)", color: "#fff", minWidth: 0, flex: "0 1 auto", whiteSpace: "nowrap" }}>
      <span style={{ color: accent, display: "grid", placeItems: "center", flex: "0 0 auto", fontSize: "clamp(11px, 3.4vw, 17px)" }}>{icon}</span>
      <span style={{ fontSize: "clamp(6.6px, 2.3vw, 9.2px)", fontWeight: 950, lineHeight: 1, whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}
function recentScoreItems(events: any[], playerId: string, max = 5) {
  return [...(events || [])].filter((e: any) => e.playerId === playerId).slice(-max).reverse().map((ev: any, idx: number) => ({
    id: `${ev.ts}_${idx}`,
    ok: (ev?.revealed || 0) > 0,
    label: String(ev?.resultLabel || ev?.volleyScore || 0),
    detail: ev?.darts?.length ? ev.darts.map((d: any) => d.label).join(" + ") : "—",
    count: Number(ev?.revealed || 0),
    total: Number(ev?.volleyScore || 0),
  }));
}
function RecentScoreBadges({ scores, onClick, compact = false }: any) {
  return <button type="button" onClick={onClick} style={{ width: "100%", minHeight: compact ? 54 : 66, borderRadius: 14, border: `1px dashed rgba(214,166,53,.55)`, background: "rgba(255,248,232,.82)", padding: compact ? 8 : 9, overflow: "hidden", textAlign: "left", cursor: "pointer", boxShadow: "0 6px 15px rgba(0,0,0,.06)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}><div style={{ color: "#655039", fontSize: 8, fontWeight: 1000, letterSpacing: .4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>DERNIERS SCORES</div><div style={{ color: "#b7871e", fontSize: 8.2, fontWeight: 1000 }}>VOIR ▸</div></div><div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 5 }}>{scores?.length ? scores.map((item: any) => <div key={item.id} style={{ minWidth: 0, borderRadius: 9, border: `1px solid ${item.ok ? "rgba(78,201,145,.38)" : "rgba(255,113,138,.38)"}`, background: item.ok ? "rgba(78,201,145,.16)" : "rgba(255,113,138,.14)", color: item.ok ? "#1d8c62" : "#c54e65", padding: compact ? "5px 2px" : "6px 3px", textAlign: "center" }}><div style={{ fontSize: compact ? 11 : 12, fontWeight: 1000, lineHeight: 1 }}>{item.label}</div><div style={{ marginTop: 2, fontSize: 7.4, fontWeight: 1000, opacity: .88 }}>{item.ok ? "VALIDÉ" : "RATÉ"}</div></div>) : Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ minWidth: 0, borderRadius: 9, border: "1px dashed rgba(151,124,77,.35)", background: "rgba(255,255,255,.45)", color: "#8e785b", padding: compact ? "5px 2px" : "6px 3px", textAlign: "center" }}><div style={{ fontSize: compact ? 11 : 12, fontWeight: 1000, lineHeight: 1 }}>—</div><div style={{ marginTop: 2, fontSize: 7.1, fontWeight: 1000, opacity: .88 }}>VIDE</div></div>)}</div><div style={{ marginTop: 5, color: "#8b6d46", fontSize: 8.4, fontWeight: 900 }}>{compact ? "Toucher pour ouvrir l'historique" : "5 dernières volées · vert = validé · rouge = raté"}</div></button>;
}
function ScoreResultOverlay({ result, lang = "fr" }: any) {
  if (!result) return null;
  const score = Math.round(Number(result?.score) || 0);
  const material = loterieScoreMaterial(score);
  const outOfRange = isHorsLoterieScore(score);
  const src = outOfRange ? loterieOutOfDrawCardUrl(lang) : loterieScoreCardUrl(score);
  const good = Boolean(result?.good) && !outOfRange;
  const status = good ? GOOD : BAD;
  const cardNumbers = Array.isArray(result?.cardNumbers) ? result.cardNumbers : [];
  const animationMs = `${SCORE_REVEAL_MS}ms`;
  const scoreLabel = String(result?.label || score || 0);
  const aura = outOfRange ? "#ff5a72" : material.aura;
  return (
    <div
      aria-live="assertive"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10030,
        display: "grid",
        placeItems: "center",
        pointerEvents: "auto",
        background: "radial-gradient(circle at 50% 46%, rgba(0,0,0,.16), rgba(0,0,0,.58) 68%, rgba(0,0,0,.72))",
        backdropFilter: "blur(2px)",
        animation: `lotScoreBackdrop ${animationMs} ease both`,
      }}
    >
      <div style={{ display: "grid", justifyItems: "center", gap: 9, transformOrigin: "center", animation: `lotScoreCardReveal ${animationMs} cubic-bezier(.2,.8,.2,1) both` }}>
        <div style={{ position: "relative", width: "min(248px,58vw)", maxHeight: "64dvh", display: "grid", placeItems: "center" }}>
          <div aria-hidden style={{ position: "absolute", inset: "8% 6%", borderRadius: "42%", background: aura, opacity: .58, filter: "blur(36px)", transform: "scale(1.08)", animation: "lotMaterialAura 1.1s ease-in-out infinite alternate" }} />
          {src ? (
            <>
              <img src={src} alt={outOfRange ? (lang === "fr" ? "Carte HORS LOT" : "Card OUT OF DRAW") : `Score ${score}`} style={{ position: "relative", zIndex: 2, display: "block", maxWidth: "100%", maxHeight: "64dvh", width: "auto", height: "auto", objectFit: "contain", borderRadius: 18, filter: `${good ? "" : "saturate(.78) brightness(.92) contrast(1.04) "}drop-shadow(0 0 14px ${aura}) drop-shadow(0 0 30px ${aura}) drop-shadow(0 0 12px ${status})`, boxShadow: `0 0 0 2px ${status}88, 0 0 22px ${status}33, 0 18px 42px rgba(0,0,0,.54)` }} />
              {!good ? (
                <>
                  <div aria-hidden style={{ position: "absolute", inset: "1.6% 1.8%", zIndex: 3, borderRadius: 18, background: "linear-gradient(180deg, rgba(255,72,108,.24), rgba(92,6,22,.18))", boxShadow: `inset 0 0 0 2px ${BAD}b8, inset 0 0 34px rgba(255,49,91,.34), 0 0 26px rgba(255,49,91,.16)` }} />
                  <div aria-hidden style={{ position: "absolute", left: 14, right: 14, bottom: 14, zIndex: 4, borderRadius: 12, padding: "6px 8px", border: `1px solid ${BAD}aa`, background: "rgba(34,4,10,.72)", color: BAD, textAlign: "center", fontSize: 10.5, fontWeight: 1000, letterSpacing: .6 }}>NON VALIDÉ</div>
                </>
              ) : null}
            </>
          ) : (
            <div style={{ position: "relative", zIndex: 2, width: "min(220px,54vw)", aspectRatio: "2 / 3", borderRadius: 20, border: `2px solid ${status}bb`, background: "linear-gradient(145deg,#ead9b8,#f8efd9 50%,#d4bd91)", boxShadow: `0 0 24px ${aura}, 0 0 0 2px ${status}66, 0 18px 42px rgba(0,0,0,.54)`, overflow: "hidden" }}>
              <div aria-hidden style={{ position: "absolute", inset: 10, borderRadius: 16, border: `1px solid ${status}66`, boxShadow: `inset 0 0 0 1px rgba(124,77,32,.28), inset 0 0 28px rgba(255,255,255,.18)` }} />
              <div aria-hidden style={{ position: "absolute", inset: "10% 10% auto", height: "44%", background: `radial-gradient(circle at 50% 68%, ${aura}55, transparent 70%)` }} />
              <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateRows: "auto 1fr auto", alignItems: "center", justifyItems: "center", padding: "16px 14px 18px" }}>
                <div style={{ width: "100%", textAlign: "center" }}>
                  <div style={{ color: BAD, fontSize: 10.5, fontWeight: 1000, letterSpacing: 1.4 }}>HORS LOTERIE</div>
                  <div style={{ marginTop: 3, color: "rgba(107,78,48,.88)", fontSize: 8.2, fontWeight: 1000, letterSpacing: .5 }}>SCORE NON PRÉSENT SUR LES CARTONS</div>
                </div>
                <div style={{ display: "grid", justifyItems: "center", gap: 8 }}>
                  <div style={{ color: BAD, fontSize: 72, fontWeight: 1000, lineHeight: .92, textShadow: `0 0 18px ${aura}` }}>{scoreLabel}</div>
                  <div style={{ width: 92, height: 1, background: "rgba(132,97,62,.4)" }} />
                  <div style={{ color: BAD, fontSize: 12.5, fontWeight: 1000, letterSpacing: 1.1 }}>RATÉ</div>
                </div>
                <div style={{ width: "100%", display: "grid", justifyItems: "center", gap: 6 }}>
                  <div style={{ color: "#ae854f", fontSize: 17, lineHeight: 1 }}>★</div>
                  <div style={{ width: "72%", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8, color: BAD }}>
                    <div style={{ height: 1, background: "rgba(132,97,62,.4)" }} />
                    <div style={{ fontSize: 9.5, fontWeight: 1000, letterSpacing: .9 }}>NON VALIDÉ</div>
                    <div style={{ height: 1, background: "rgba(132,97,62,.4)" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ minWidth: "min(270px,78vw)", padding: "10px 12px 11px", borderRadius: 15, border: `1px solid ${status}88`, background: "rgba(6,8,12,.92)", boxShadow: `0 0 20px ${status}33, 0 10px 28px rgba(0,0,0,.4)`, textAlign: "center" }}>
          <div style={{ color: status, fontSize: 16, lineHeight: 1, fontWeight: 1000, letterSpacing: .8 }}>{good ? "DÉVOILÉ" : (outOfRange ? (lang === "fr" ? "HORS LOT" : "OUT OF DRAW") : "RATÉ")}</div>
          <div style={{ marginTop: 6, color: good ? SOFT : BAD, fontSize: 11.2, fontWeight: 900 }}>{good ? `Score ${scoreLabel} découvert` : (outOfRange ? (lang === "fr" ? `Score ${scoreLabel} hors lot` : `Score ${scoreLabel} out of draw`) : `Score ${scoreLabel} non validé`)}</div>
          {good && cardNumbers.length ? <div style={{ marginTop: 7, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>{cardNumbers.map((n: number) => <div key={n} style={{ minWidth: 38, padding: "5px 8px", borderRadius: 10, border: `1px solid ${GOOD}90`, background: "rgba(112,239,189,.15)", color: GOOD, fontSize: 11, fontWeight: 1000 }}>C{n}</div>)}</div> : null}
        </div>
      </div>
    </div>
  );
}

function StatsDetailModal({ player, onClose, accent = GOLD }: any) {
  if (!player) return null;
  const best = bestCardProgress(player);
  const total = player?.cards?.[0]?.cells?.length || 10;
  const stats = [
    ["Meilleur carton", `${best}/${total}`, accent],
    ["Cases restantes", Math.max(0, total - best), accent],
    ["Cases dévoilées", player?.stats?.cellsRevealed || 0, CYAN],
    ["Tours joués", player?.stats?.visits || 0, CYAN],
    ["Tours gagnants", player?.stats?.successfulVisits || 0, GOOD],
    ["Tours ratés", player?.stats?.emptyVisits || 0, BAD],
    ["Multi-hits", player?.stats?.multiHits || 0, PINK],
    ["Meilleur hit", `${player?.stats?.maxCellsInVisit || 0} case(s)`, accent],
    ["Série max", player?.stats?.bestStreak || 0, GOOD],
    ["Volée moyenne", player?.stats?.visits ? ((player?.stats?.totalVolleyScore || 0) / player.stats.visits).toFixed(1) : "0.0", CYAN],
    ["Meilleure volée", player?.stats?.maxVolley || 0, CYAN],
    ["Darts lancés", player?.stats?.dartsThrown || 0, SOFT],
  ];
  return <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10008, background: "rgba(0,0,0,.74)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 12 }}><div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px,100%)", maxHeight: "86dvh", overflowY: "auto", borderRadius: 18, border: `1px solid ${accent}55`, background: "linear-gradient(180deg,#10141f,#090c13 48%,#07080c)", boxShadow: "0 26px 65px rgba(0,0,0,.55)", padding: 12 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}><div><div style={{ color: accent, fontWeight: 1000, fontSize: 15 }}>STATISTIQUES LOTERIE</div><div style={{ color: SOFT, fontSize: 10, marginTop: 2 }}>{player?.name} · détails en cours de partie</div></div><button type="button" onClick={onClose} style={carouselBtnStyle(accent)}>×</button></div><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 12 }}>{stats.map(([label, value, color]: any) => <div key={label} style={{ borderRadius: 13, padding: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}><div style={{ color: SOFT, fontSize: 8.5, fontWeight: 1000, textTransform: "uppercase" }}>{label}</div><div style={{ marginTop: 4, color, fontSize: 19, fontWeight: 1000 }}>{value}</div></div>)}</div></div></div>;
}

function RulesContent({ config, accent = GOLD }: any) {
  return (
    <div style={{ display: "grid", gap: 12, fontSize: 13, lineHeight: 1.5 }}>
      <div><strong style={{ color: accent }}>OBJECTIF</strong><br />Complète entièrement un carton. Le premier participant — joueur ou équipe — qui révèle toutes les cases d'un même carton gagne la partie.</div>
      <div><strong style={{ color: CYAN }}>DÉROULÉ D'UN TOUR</strong><br />En mode classique, tu lances {config.volleyMode === "strict3" ? "3 fléchettes" : "jusqu'à 3 fléchettes"}. On additionne la volée, puis ce total est recherché sur tous tes cartons. Si le nombre existe, la ou les cases correspondantes se dévoilent automatiquement.</div>
      <div><strong style={{ color: PINK }}>PLUSIEURS CARTONS</strong><br />Un même score peut apparaître sur plusieurs cartons. Une seule volée peut donc ouvrir plusieurs cases en même temps : hit simple, double hit, triple hit ou jackpot.</div>
      <div><strong style={{ color: GOOD }}>BLOC CARTONS</strong><br />Le bloc CARTONS affiche chaque carton avec sa progression. Ouvre le carrousel pour voir le détail visuel de chaque ticket.</div>
      <div><strong style={{ color: BAD }}>DERNIERS SCORES</strong><br />Le bloc DERNIERS SCORES garde les 5 dernières volées : vert = score ayant validé au moins une case, rouge = score joué sans ouvrir de case.</div>
      {config.variant === "express" ? <div><strong style={{ color: accent }}>MODE EXPRESS</strong><br />En express, une seule fléchette est jouée par tour. Selon le réglage, il faut viser soit un simple exact, soit un double exact, soit un triple exact.</div> : null}
      {config.participantMode === "teams" ? <div><strong style={{ color: CYAN }}>MODE ÉQUIPES</strong><br />Les cartons sont partagés par équipe. À chaque passage de l’équipe, le joueur suivant de sa composition devient le joueur actif. Ses découvertes alimentent le carton commun et ses statistiques personnelles.</div> : null}
    </div>
  );
}

function eventStats(items: any[]) {
  const ordered = [...(items || [])].sort((a, b) => Number(a?.ts || 0) - Number(b?.ts || 0));
  let streak = 0, bestStreak = 0, emptyStreak = 0, longestEmptyStreak = 0;
  let singles = 0, doubles = 0, triples = 0, bulls = 0, dbulls = 0, dartMisses = 0, dartPoints = 0;
  let hit0 = 0, hit1 = 0, hit2 = 0, hit3plus = 0, successfulVolleyScore = 0, missedVolleyScore = 0;
  const scoreMap: Record<string, { attempts: number; hits: number; misses: number; reveals: number }> = {};
  const segmentCounts: Record<string, number> = {};
  for (const ev of ordered) {
    const revealed = Number(ev?.revealed || 0);
    const ok = revealed > 0;
    streak = ok ? streak + 1 : 0;
    emptyStreak = ok ? 0 : emptyStreak + 1;
    bestStreak = Math.max(bestStreak, streak);
    longestEmptyStreak = Math.max(longestEmptyStreak, emptyStreak);
    if (revealed <= 0) hit0 += 1;
    else if (revealed === 1) hit1 += 1;
    else if (revealed === 2) hit2 += 1;
    else hit3plus += 1;
    const volley = Number(ev?.volleyScore || 0);
    if (ok) successfulVolleyScore += volley;
    else missedVolleyScore += volley;
    const resultLabel = String(ev?.resultLabel ?? ev?.volleyScore ?? "0");
    const bucket = scoreMap[resultLabel] || { attempts: 0, hits: 0, misses: 0, reveals: 0 };
    bucket.attempts += 1;
    bucket.reveals += revealed;
    if (ok) bucket.hits += 1; else bucket.misses += 1;
    scoreMap[resultLabel] = bucket;
    for (const d of Array.isArray(ev?.darts) ? ev.darts : []) {
      const v = Number(d?.v || 0);
      const mult = Number(d?.mult || 0);
      dartPoints += Number(d?.score ?? dartScore(d) ?? 0) || 0;
      if (!v || !mult) { dartMisses += 1; continue; }
      segmentCounts[String(v)] = Number(segmentCounts[String(v)] || 0) + 1;
      if (v === 25 && mult === 2) dbulls += 1;
      else if (v === 25) bulls += 1;
      else if (mult === 3) triples += 1;
      else if (mult === 2) doubles += 1;
      else singles += 1;
    }
  }
  const visits = ordered.length;
  const successfulVisits = ordered.reduce((n, ev) => n + (Number(ev?.revealed || 0) > 0 ? 1 : 0), 0);
  const emptyVisits = visits - successfulVisits;
  const cellsRevealed = ordered.reduce((n, ev) => n + Number(ev?.revealed || 0), 0);
  const multiHits = ordered.reduce((n, ev) => n + (Number(ev?.revealed || 0) >= 2 ? 1 : 0), 0);
  const maxCellsInVisit = ordered.reduce((m, ev) => Math.max(m, Number(ev?.revealed || 0)), 0);
  const totalVolleyScore = ordered.reduce((n, ev) => n + Number(ev?.volleyScore || 0), 0);
  const maxVolley = ordered.reduce((m, ev) => Math.max(m, Number(ev?.volleyScore || 0)), 0);
  const dartsThrown = ordered.reduce((n, ev) => n + (Array.isArray(ev?.darts) ? ev.darts.length : 0), 0);
  return {
    visits, dartsThrown, successfulVisits, emptyVisits, cellsRevealed, multiHits, maxCellsInVisit,
    bestStreak, longestEmptyStreak, totalVolleyScore, averageVolley: visits ? totalVolleyScore / visits : 0, maxVolley,
    hitRate: visits ? successfulVisits / visits : 0,
    avgCellsPerVisit: visits ? cellsRevealed / visits : 0,
    cellsPerSuccessfulVisit: successfulVisits ? cellsRevealed / successfulVisits : 0,
    multiRate: visits ? multiHits / visits : 0,
    singles, doubles, triples, bulls, dbulls, dartMisses, dartPoints,
    dartOnBoardRate: dartsThrown ? (dartsThrown - dartMisses) / dartsThrown : 0,
    averageDartScore: dartsThrown ? dartPoints / dartsThrown : 0,
    hit0, hit1, hit2, hit3plus,
    successfulVolleyScore, missedVolleyScore,
    avgSuccessfulVolley: successfulVisits ? successfulVolleyScore / successfulVisits : 0,
    avgMissedVolley: emptyVisits ? missedVolleyScore / emptyVisits : 0,
    uniqueScores: Object.keys(scoreMap).length,
    scoreMap, segmentCounts,
  };
}

function playerSummary(p: LoteriePlayerState, winnerId: string | null, rank = 1) {
  const visits = p.stats.visits || 0;
  const best = bestCardProgress(p);
  const cardProgresses = (p.cards || []).map((c: any) => cardProgress(c));
  const totalCells = p.cards?.[0]?.cells?.length || 0;
  const averageCardProgress = cardProgresses.length ? cardProgresses.reduce((a: number, b: number) => a + b, 0) / cardProgresses.length : 0;
  const worstCardProgress = cardProgresses.length ? Math.min(...cardProgresses) : 0;
  const nearCompleteCards = totalCells ? cardProgresses.filter((v: number) => v < totalCells && v / totalCells >= .8).length : 0;
  const untouchedCards = cardProgresses.filter((v: number) => v === 0).length;
  return {
    id: p.id, playerId: p.id, profileId: p.id, entityId: p.id, name: p.name, avatarDataUrl: avatarOf(p),
    win: p.id === winnerId, winner: p.id === winnerId, rank,
    score: p.stats.cellsRevealed, points: p.stats.cellsRevealed, cardsCount: p.cards.length,
    cardsCompleted: p.stats.cardsCompleted, bestCardProgress: best, cellsPerCard: totalCells,
    averageCardProgress, worstCardProgress, nearCompleteCards, untouchedCards,
    cardCompletionRate: p.cards.length ? p.stats.cardsCompleted / p.cards.length : 0,
    cellsRevealed: p.stats.cellsRevealed, visits, dartsThrown: p.stats.dartsThrown,
    successfulVisits: p.stats.successfulVisits, emptyVisits: p.stats.emptyVisits,
    hitCount: p.stats.successfulVisits, hits: p.stats.successfulVisits, misses: p.stats.emptyVisits,
    hitRate: visits ? p.stats.successfulVisits / visits : 0, accuracy: visits ? (p.stats.successfulVisits / visits) * 100 : 0,
    avgCellsPerVisit: visits ? p.stats.cellsRevealed / visits : 0,
    multiHits: p.stats.multiHits, maxCellsInVisit: p.stats.maxCellsInVisit, bestStreak: p.stats.bestStreak,
    totalVolleyScore: p.stats.totalVolleyScore, averageVolley: visits ? p.stats.totalVolleyScore / visits : 0,
    maxVolley: p.stats.maxVolley, completedOnVisit: p.stats.completedOnVisit,
    targetMin: p.targetMin, targetMax: p.targetMax,
    isTeam: Boolean((p as any).isTeam), teamId: (p as any).teamId || null, memberIds: (p as any).memberIds || [], members: (p as any).members || [],
    cards: p.cards.map((c) => ({ id: c.id, progress: cardProgress(c), total: c.cells.length, cells: c.cells.map((x) => ({ key: x.key, value: x.value, label: x.label, revealed: x.revealed })) })),
  };
}

function buildLoterieSummaries(finalPlayers: LoteriePlayerState[], winnerId: string | null, finalEvents: any[], config: any) {
  const ranked = [...finalPlayers].sort((a, b) => {
    if (a.id === winnerId) return -1;
    if (b.id === winnerId) return 1;
    return bestCardProgress(b) - bestCardProgress(a) || b.stats.cellsRevealed - a.stats.cellsRevealed || a.stats.visits - b.stats.visits;
  });
  const rankById = new Map(ranked.map((p, index) => [String(p.id), index + 1]));
  const entityRows = finalPlayers.map((p) => playerSummary(p, winnerId, rankById.get(String(p.id)) || 99)).sort((a, b) => a.rank - b.rank);
  const participantMode = config?.participantMode === "teams" ? "teams" : "players";
  const teamRows = participantMode === "teams" ? entityRows.map((row: any) => {
    const items = (finalEvents || []).filter((ev: any) => String(ev?.entityId || ev?.teamEntityId || ev?.playerId) === String(row.entityId));
    const st = eventStats(items);
    return {
      ...row,
      ...st,
      id: row.entityId,
      teamId: row.teamId || row.entityId,
      teamName: row.name,
      playerIds: [...(row.memberIds || [])],
      players: [...(row.memberIds || [])],
    };
  }) : [];

  const playerRows: any[] = [];
  if (participantMode === "teams") {
    for (const team of finalPlayers as any[]) {
      const teamRank = rankById.get(String(team.id)) || 99;
      const teamWin = String(team.id) === String(winnerId || "");
      const members = Array.isArray(team.members) ? team.members : [];
      const teamEvents = (finalEvents || []).filter((ev: any) => String(ev?.entityId || ev?.teamEntityId || ev?.playerId) === String(team.id));
      for (const member of members) {
        const memberEvents = teamEvents.filter((ev: any) => String(ev?.actorId || ev?.memberId || "") === String(member.id));
        const st = eventStats(memberEvents);
        playerRows.push({
          id: String(member.id), playerId: String(member.id), profileId: String(member.id), name: member.name || "Joueur",
          avatarDataUrl: member.avatarDataUrl || member.avatarUrl || null,
          teamId: team.id, teamSourceId: team.teamId || null, teamName: team.name, teamColor: team.color || null,
          isTeamMember: true, participantMode: "teams", win: teamWin, winner: teamWin, rank: teamRank,
          score: st.cellsRevealed, points: st.cellsRevealed, cellsRevealed: st.cellsRevealed, contributionCells: st.cellsRevealed,
          visits: st.visits, dartsThrown: st.dartsThrown, successfulVisits: st.successfulVisits, emptyVisits: st.emptyVisits,
          hitCount: st.successfulVisits, hits: st.successfulVisits, misses: st.emptyVisits, hitRate: st.hitRate, accuracy: st.hitRate * 100,
          avgCellsPerVisit: st.avgCellsPerVisit, cellsPerSuccessfulVisit: st.cellsPerSuccessfulVisit, multiHits: st.multiHits, multiRate: st.multiRate, maxCellsInVisit: st.maxCellsInVisit, bestStreak: st.bestStreak, longestEmptyStreak: st.longestEmptyStreak,
          totalVolleyScore: st.totalVolleyScore, averageVolley: st.averageVolley, maxVolley: st.maxVolley, avgSuccessfulVolley: st.avgSuccessfulVolley, avgMissedVolley: st.avgMissedVolley,
          singles: st.singles, doubles: st.doubles, triples: st.triples, bulls: st.bulls, dbulls: st.dbulls, dartMisses: st.dartMisses, dartPoints: st.dartPoints, dartOnBoardRate: st.dartOnBoardRate, averageDartScore: st.averageDartScore,
          hit0: st.hit0, hit1: st.hit1, hit2: st.hit2, hit3plus: st.hit3plus, uniqueScores: st.uniqueScores, scoreMap: st.scoreMap, segmentCounts: st.segmentCounts,
          cardsCount: team.cards?.length || 0, cardsCompleted: team.stats?.cardsCompleted || 0,
          cards: (team.cards || []).map((c: any) => ({ id: c.id, progress: cardProgress(c), total: c.cells?.length || 0, cells: (c.cells || []).map((x: any) => ({ key: x.key, value: x.value, label: x.label, revealed: x.revealed })) })),
          bestCardProgress: bestCardProgress(team), teamBestCardProgress: bestCardProgress(team), cellsPerCard: team.cards?.[0]?.cells?.length || config?.cellsPerCard || 0,
          completedOnVisit: teamWin ? team.stats?.completedOnVisit ?? null : null,
          targetMin: team.targetMin, targetMax: team.targetMax,
        });
      }
    }
  } else {
    for (const row of entityRows) {
      const items = (finalEvents || []).filter((ev: any) => String(ev?.playerId) === String(row.id));
      const st = eventStats(items);
      playerRows.push({ ...row, ...st, participantMode: "players" });
    }
  }

  const aggregateRows = participantMode === "teams" ? teamRows : entityRows;
  const visits = aggregateRows.reduce((n: number, row: any) => n + Number(row?.visits || 0), 0);
  const dartsThrown = aggregateRows.reduce((n: number, row: any) => n + Number(row?.dartsThrown || 0), 0);
  const cellsRevealed = aggregateRows.reduce((n: number, row: any) => n + Number(row?.cellsRevealed || 0), 0);
  const successfulVisits = aggregateRows.reduce((n: number, row: any) => n + Number(row?.successfulVisits || 0), 0);
  const emptyVisits = aggregateRows.reduce((n: number, row: any) => n + Number(row?.emptyVisits || 0), 0);
  const totalVolleyScore = aggregateRows.reduce((n: number, row: any) => n + Number(row?.totalVolleyScore || 0), 0);
  const eventGlobal = eventStats(finalEvents || []);
  const allCardRows = aggregateRows.flatMap((row: any) => Array.isArray(row?.cards) ? row.cards : []);
  const cardProgressTotal = allCardRows.reduce((s: number, c: any) => s + Number(c?.progress || 0), 0);
  const averageCardProgress = allCardRows.length ? cardProgressTotal / allCardRows.length : 0;
  const totalCardsCompleted = aggregateRows.reduce((s: number, row: any) => s + Number(row?.cardsCompleted || 0), 0);
  const matchStats = {
    participantMode,
    variant: config?.variant || "classic",
    expressTarget: config?.expressTarget || null,
    cardsPerPlayer: Number(config?.cardsPerPlayer || 1), cellsPerCard: Number(config?.cellsPerCard || 10),
    participants: aggregateRows.length, playerCount: playerRows.length, teamCount: teamRows.length,
    visits, dartsThrown, cellsRevealed, successfulVisits, emptyVisits,
    hitRate: visits ? successfulVisits / visits : 0,
    avgCellsPerVisit: visits ? cellsRevealed / visits : 0,
    cellsPerSuccessfulVisit: successfulVisits ? cellsRevealed / successfulVisits : 0,
    cellsPer100Darts: dartsThrown ? (cellsRevealed / dartsThrown) * 100 : 0,
    multiHits: aggregateRows.reduce((n: number, row: any) => n + Number(row?.multiHits || 0), 0),
    multiRate: visits ? aggregateRows.reduce((n: number, row: any) => n + Number(row?.multiHits || 0), 0) / visits : 0,
    maxCellsInVisit: aggregateRows.reduce((m: number, row: any) => Math.max(m, Number(row?.maxCellsInVisit || 0)), 0),
    bestStreak: aggregateRows.reduce((m: number, row: any) => Math.max(m, Number(row?.bestStreak || 0)), 0),
    longestEmptyStreak: eventGlobal.longestEmptyStreak,
    totalVolleyScore, averageVolley: visits ? totalVolleyScore / visits : 0,
    maxVolley: aggregateRows.reduce((m: number, row: any) => Math.max(m, Number(row?.maxVolley || 0)), 0),
    avgSuccessfulVolley: eventGlobal.avgSuccessfulVolley, avgMissedVolley: eventGlobal.avgMissedVolley,
    singles: eventGlobal.singles, doubles: eventGlobal.doubles, triples: eventGlobal.triples, bulls: eventGlobal.bulls, dbulls: eventGlobal.dbulls,
    dartMisses: eventGlobal.dartMisses, dartPoints: eventGlobal.dartPoints, dartOnBoardRate: eventGlobal.dartOnBoardRate, averageDartScore: eventGlobal.averageDartScore,
    hit0: eventGlobal.hit0, hit1: eventGlobal.hit1, hit2: eventGlobal.hit2, hit3plus: eventGlobal.hit3plus,
    uniqueScores: eventGlobal.uniqueScores, scoreMap: eventGlobal.scoreMap, segmentCounts: eventGlobal.segmentCounts,
    cardsPlayed: allCardRows.length, cardsCompleted: totalCardsCompleted, averageCardProgress,
    nearCompleteCards: allCardRows.filter((c: any) => Number(c?.total || config?.cellsPerCard || 10) > 0 && Number(c?.progress || 0) < Number(c?.total || config?.cellsPerCard || 10) && Number(c?.progress || 0) / Number(c?.total || config?.cellsPerCard || 10) >= .8).length,
    untouchedCards: allCardRows.filter((c: any) => Number(c?.progress || 0) === 0).length,
  };
  return { entityRows, teamRows, playerRows, matchStats, ranked };
}

function ScratchCell({ cell, idx, recent }: any) {
  const covered = !cell?.revealed;
  return (
    <div style={{ position: "relative", minHeight: 76, animation: recent ? "lotScratchReveal .55s ease both" : undefined }}>
      <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", width: 25, height: 25, borderRadius: "50%", background: "#15120d", color: "#f8edd0", border: "2px solid #c79c3d", display: "grid", placeItems: "center", fontWeight: 1000, fontSize: 9, zIndex: 2, boxShadow: recent ? "0 0 0 4px rgba(246,194,86,.14)" : "0 3px 10px rgba(0,0,0,.18)" }}>{idx + 1}</div>
      <div style={{ height: "100%", borderRadius: 13, border: `1px solid ${covered ? "#b8954b" : "#b79147"}`, background: covered ? `linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.04)), url(${SCRATCH_CELL_TEXTURE}) center/cover no-repeat, linear-gradient(145deg,#c9c7c4,#a9adb1 45%,#90969c)` : "linear-gradient(180deg,#f6eacb,#ead8ae)", boxShadow: covered ? "inset 0 2px 0 rgba(255,255,255,.18), inset 0 -8px 14px rgba(0,0,0,.08), 0 3px 8px rgba(0,0,0,.08)" : (recent ? "0 0 0 2px rgba(246,194,86,.24), 0 8px 18px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.34)" : "inset 0 1px 0 rgba(255,255,255,.34), 0 3px 8px rgba(0,0,0,.06)"), overflow: "hidden", display: "grid", placeItems: "center", position: "relative", padding: 6 }}>
        {covered ? <><div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,.14), transparent 35%, rgba(0,0,0,.08) 100%)", mixBlendMode: "screen" }} /><div style={{ position: "absolute", inset: 2, borderRadius: 11, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }} /></> : <><div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 25%,rgba(255,255,255,.16),transparent 40%), radial-gradient(circle at 70% 78%,rgba(0,0,0,.05),transparent 36%)" }} />{recent ? <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent)", animation: "lotCardShine .7s ease .08s both" }} /> : null}<div style={{ color: "#20160c", fontWeight: 1000, fontSize: cell.label.length > 4 ? 17 : 26, lineHeight: 1, whiteSpace: "nowrap", textShadow: "0 1px 0 rgba(255,255,255,.18)" }}>{cell.label}</div><div style={{ position: "absolute", right: 4, bottom: 4, transform: "rotate(-8deg)", padding: "2px 6px", borderRadius: 999, border: `1px solid ${idx % 3 === 0 ? "#b8322b" : "#b98a1f"}`, color: idx % 3 === 0 ? "#b8322b" : "#a87816", background: "rgba(255,255,255,.44)", fontSize: 7.4, fontWeight: 1000, whiteSpace: "nowrap", boxShadow: "0 2px 5px rgba(0,0,0,.08)", animation: recent ? "lotStampPop .48s ease .12s both" : undefined }}>{idx % 3 === 0 ? "VALIDÉ" : "✓ VALIDÉ"}</div></>}
      </div>
    </div>
  );
}

function TicketCard({ card, index, player, recentRevealKeys, lastVolleyText, onOpenHistory, recentScores }: any) {
  const progress = cardProgress(card);
  const complete = progress === card.cells.length;
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 540, margin: "0 auto", borderRadius: 28, padding: "14px 12px 13px", border: `2px solid ${complete ? "#8f7b3c" : "#c39b45"}`, background: "linear-gradient(180deg,#f6efdc 0%, #efe5cc 38%, #e7dbc0 68%, #dfd2b3 100%)", color: "#20160b", boxShadow: "0 24px 70px rgba(0,0,0,.46), inset 0 0 0 1px rgba(93,56,18,.12)", overflow: "hidden", boxSizing: "border-box" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 18% 14%, rgba(255,255,255,.26), transparent 23%), radial-gradient(circle at 85% 86%, rgba(70,52,24,.08), transparent 24%), radial-gradient(circle at 50% 50%, rgba(255,255,255,.08), transparent 70%), repeating-linear-gradient(0deg, rgba(108,88,49,.045) 0 1px, transparent 1px 5px), repeating-linear-gradient(90deg, rgba(116,93,53,.03) 0 1px, transparent 1px 7px)" }} />
      <img src={scratchTicketPreview} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .022, filter: "grayscale(1) sepia(.65) saturate(.5)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 6, borderRadius: 22, border: "1px solid rgba(123,87,27,.24)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.18), inset 0 0 25px rgba(123,87,27,.05), inset 0 0 0 8px rgba(121,97,52,.028)" }} />
      <div style={{ position: "absolute", inset: 12, borderRadius: 18, border: "1px solid rgba(150,118,61,.14)", opacity: .9 }} />
      <div style={{ position: "absolute", left: 10, right: 10, top: -1, height: 11, background: "radial-gradient(circle at 6px 7px, transparent 0 6px, rgba(255,255,255,.65) 6px 7px, transparent 7px 100%) 0 0/28px 11px repeat-x" }} />
      <div style={{ position: "relative" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "Georgia, Times New Roman, serif", fontSize: "clamp(34px,8.6vw,52px)", lineHeight: .95, fontWeight: 900, color: "#201109", letterSpacing: 1.5, textShadow: "0 1px 0 rgba(255,245,215,.78), 0 2px 0 rgba(186,138,57,.56), 0 8px 16px rgba(0,0,0,.12)", WebkitTextStroke: "0.4px rgba(131,90,25,.65)", textTransform: "uppercase" }}>LOTERIE</div>
          <div style={{ margin: "4px auto 0", width: 148, maxWidth: "64%", height: 8, opacity: .72, background: "linear-gradient(90deg, transparent 0 4%, rgba(165,121,42,.68) 4% 31%, transparent 31% 37%, rgba(165,121,42,.68) 37% 63%, transparent 63% 69%, rgba(165,121,42,.68) 69% 96%, transparent 96% 100%)" }} />
          <div style={{ display: "inline-block", marginTop: 8, borderRadius: 999, padding: "6px 14px", background: "linear-gradient(180deg,#ff8a61,#ff5a3e)", color: "#fff7e7", fontSize: 10.5, fontWeight: 1000, boxShadow: "0 8px 16px rgba(170,58,24,.20)" }}>{(player as any)?.isTeam ? "Carton équipe" : "Carton joueur"} · {index + 1}/{player.cards.length}</div>
          <div style={{ marginTop: 12, fontSize: 9.8, fontWeight: 1000, lineHeight: 1.25, letterSpacing: .15, color: "#543a18" }}>DÉCOUVREZ LES CIBLES ET COMPLÉTEZ VOTRE CARTON</div>
        </div>

        <div style={{ marginTop: 13, display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 8 }}>
          {card.cells.map((cell: any, idx: number) => <ScratchCell key={cell.key} cell={cell} idx={idx} recent={recentRevealKeys?.includes(`${card.id}:${cell.key}`)} />)}
        </div>

        <div style={{ margin: "14px auto 0", width: "fit-content", maxWidth: "100%", padding: "6px 15px", borderRadius: 999, background: "#5a3d19", color: "#ffe98b", fontWeight: 1000, fontSize: 10, whiteSpace: "nowrap", boxShadow: "inset 0 1px 0 rgba(255,255,255,.12)" }}>{card.cells.length} CIBLES À DÉCOUVRIR · {progress}/{card.cells.length}</div>

        <div style={{ marginTop: 11, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
          <TicketInfo label={(player as any)?.isTeam ? "ÉQUIPE" : "JOUEUR"} value={player.name} />
          <TicketInfo label="CARTON" value={`${index + 1} / ${player.cards.length}`} />
          <TicketInfo label="PROGRESSION" value={`${progress} / ${card.cells.length}`} progress={progress / Math.max(1, card.cells.length)} />
          <RecentScoreBadges scores={recentScores} onClick={onOpenHistory} compact />
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

function ScoreHistoryModal({ player, config, events, onClose, accent = GOLD }: any) {
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
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}><div><div style={{ color:accent, fontWeight:1000, fontSize:14 }}>DERNIERS SCORES · {player?.name}</div><div style={{ color:SOFT, fontSize:10, marginTop:2 }}>{config.variant === 'classic' ? 'Vert = score ayant ouvert au moins une case · Rouge = score raté' : 'Historique des lancers express'}</div></div><button type='button' onClick={onClose} style={carouselBtnStyle(accent)}>×</button></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:12 }}>
          <HistoryGroup title='SCORES VALIDÉS' color={GOOD} fill='rgba(112,239,189,.12)' items={valides} empty='Aucun score validé' />
          <HistoryGroup title='SCORES RATÉS' color={BAD} fill='rgba(255,113,138,.10)' items={refuses} empty='Aucun score refusé' />
        </div>
        <div style={{ marginTop:12, borderTop:'1px solid rgba(255,255,255,.07)', paddingTop:10 }}>
          <div style={{ color:SOFT, fontSize:10, fontWeight:1000, marginBottom:8 }}>DERNIÈRES VOLÉES</div>
          <div style={{ display:'grid', gap:7 }}>
            {playerEvents.slice(0,12).map((ev: any, idx: number) => {
              const ok = (ev?.revealed || 0) > 0;
              return <div key={`${ev.ts}_${idx}`} style={{ borderRadius:12, padding:'8px 10px', background:'rgba(255,255,255,.04)', border:`1px solid ${ok ? 'rgba(112,239,189,.25)' : 'rgba(255,113,138,.2)'}`, display:'grid', gridTemplateColumns:'auto 1fr auto', gap:8, alignItems:'center' }}><div style={{ width:8, height:8, borderRadius:999, background: ok ? GOOD : BAD }} /><div style={{ minWidth:0 }}><div style={{ color:'#fff', fontSize:11.5, fontWeight:1000, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{config.variant === 'classic' ? `${ev?.darts?.map((d:any)=>d.label).join(' + ')} = ${ev?.volleyScore}` : (ev?.darts?.[0]?.label || ev?.resultLabel || 'MISS')}</div><div style={{ marginTop:2, color:SOFT, fontSize:9 }}>{config?.participantMode === 'teams' && ev?.actorName ? `${ev.actorName} · ` : ''}{ok ? `${ev?.revealed || 0} case${(ev?.revealed || 0) > 1 ? 's' : ''} ouverte${(ev?.revealed || 0) > 1 ? 's' : ''}` : 'Aucune case'}</div></div><div style={{ color: ok ? GOOD : BAD, fontSize:10, fontWeight:1000 }}>{ok ? 'VALIDÉ' : 'REFUSÉ'}</div></div>;
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

function FloatingCardsModal({ player, initialIndex, onClose, recentRevealKeys, lastVolleyText, onOpenHistory, recentScores, accent = GOLD }: any) {
  const [index, setIndex] = React.useState(Math.max(0, Math.min(Number(initialIndex) || 0, player.cards.length - 1)));
  React.useEffect(() => setIndex(Math.max(0, Math.min(Number(initialIndex) || 0, player.cards.length - 1))), [initialIndex, player.id]);
  const prev = () => setIndex((i) => (i - 1 + player.cards.length) % player.cards.length);
  const next = () => setIndex((i) => (i + 1) % player.cards.length);
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.76)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 10px calc(12px + var(--safe-bottom))" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(620px,100%)", maxHeight: "92dvh", overflowY: "auto", position: "relative" }} className="dc-scroll-thin">
        <div style={{ position: "sticky", top: 0, zIndex: 4, display: "grid", gridTemplateColumns: "42px 1fr 42px", alignItems: "center", gap: 8, marginBottom: 8, padding: "5px 4px", borderRadius: 16, background: "rgba(8,10,16,.92)", border: `1px solid ${accent}44` }}>
          <button type="button" onClick={prev} disabled={player.cards.length <= 1} style={carouselBtnStyle(accent)}>‹</button>
          <div style={{ minWidth: 0, textAlign: "center" }}><div style={{ color: accent, fontSize: 12, fontWeight: 1000, letterSpacing: .8 }}>CARTONS · {nameOf(player)}</div><div style={{ marginTop: 1, color: SOFT, fontSize: 9.5 }}>Carton {index + 1}/{player.cards.length} · glisse avec les flèches</div></div>
          <button type="button" onClick={onClose} style={{ ...carouselBtnStyle(accent), color: "#fff" }}>×</button>
        </div>
        <TicketCard card={player.cards[index]} index={index} player={player} recentRevealKeys={recentRevealKeys} lastVolleyText={lastVolleyText} onOpenHistory={onOpenHistory} recentScores={recentScores} />
        {player.cards.length > 1 ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 9 }}><button type="button" onClick={prev} style={carouselWideBtnStyle(accent)}>← PRÉCÉDENT</button><div style={{ display: "flex", gap: 5 }}>{player.cards.map((c: any, i: number) => <button key={c.id} type="button" onClick={() => setIndex(i)} aria-label={`Carton ${i + 1}`} style={{ width: i === index ? 20 : 8, height: 8, borderRadius: 999, border: "none", background: i === index ? accent : "rgba(255,255,255,.25)", transition: "width .15s ease", cursor: "pointer" }} />)}</div><button type="button" onClick={next} style={carouselWideBtnStyle(accent)}>SUIVANT →</button></div> : null}
      </div>
    </div>
  );
}
function carouselBtnStyle(accent = GOLD): React.CSSProperties { return { width: 36, height: 36, borderRadius: 999, border: `1px solid ${accent}66`, background: "rgba(255,255,255,.05)", color: accent, fontSize: 22, fontWeight: 1000, cursor: "pointer" }; }
function carouselWideBtnStyle(accent = GOLD): React.CSSProperties { return { minHeight: 34, borderRadius: 999, border: `1px solid ${accent}55`, background: `color-mix(in srgb, ${accent} 8%, transparent)`, color: accent, padding: "0 10px", fontSize: 8.5, fontWeight: 1000, cursor: "pointer" }; }

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


function EndStat({ label, value, tone = GOLD }: any) {
  return <div style={{ minWidth: 0, padding: "9px 8px", borderRadius: 13, border: "1px solid rgba(255,255,255,.075)", background: "rgba(255,255,255,.035)", textAlign: "center" }}><div style={{ color: SOFT, fontSize: 8, fontWeight: 950, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div><div style={{ marginTop: 3, color: tone, fontSize: 17, lineHeight: 1, fontWeight: 1000 }}>{value}</div></div>;
}

function EndPie3D({ title, items, center, centerLabel }: any) {
  const clean = (items || []).filter((x: any) => Number(x?.value || 0) > 0);
  const total = clean.reduce((s: number, x: any) => s + Number(x.value || 0), 0);
  let at = 0;
  const stops = clean.map((x: any) => {
    const from = at;
    at += total ? (Number(x.value || 0) / total) * 100 : 0;
    return `${x.color} ${from}% ${at}%`;
  });
  const grad = stops.length ? `conic-gradient(${stops.join(",")})` : "conic-gradient(rgba(255,255,255,.1) 0 100%)";
  return <div style={{ minWidth:0, borderRadius:14, padding:9, border:"1px solid rgba(255,255,255,.06)", background:"rgba(255,255,255,.025)" }}><div style={{color:GOLD,fontSize:8.5,fontWeight:1000,letterSpacing:.5}}>{title}</div><div style={{display:"grid",gridTemplateColumns:"105px minmax(0,1fr)",gap:7,alignItems:"center",marginTop:5}}><div style={{position:"relative",height:82}}><div style={{position:"absolute",left:8,right:8,top:17,height:58,borderRadius:"50%",background:grad,transform:"rotateX(58deg) translateY(8px)",filter:"brightness(.38)",boxShadow:"0 10px 16px rgba(0,0,0,.4)"}}/><div style={{position:"absolute",left:8,right:8,top:8,height:58,borderRadius:"50%",background:grad,transform:"rotateX(58deg)",boxShadow:"inset 0 0 0 1px rgba(255,255,255,.12)"}}/><div style={{position:"absolute",left:36,right:36,top:27,height:26,borderRadius:"50%",background:"#0c0d11",transform:"rotateX(58deg)"}}/><div style={{position:"absolute",inset:0,display:"grid",placeItems:"center",paddingTop:3,textAlign:"center"}}><div><div style={{color:GOLD,fontSize:14,fontWeight:1000,lineHeight:1}}>{center ?? total}</div><div style={{color:SOFT,fontSize:6.3,fontWeight:900,marginTop:2}}>{centerLabel || "TOTAL"}</div></div></div></div><div style={{display:"grid",gap:4}}>{clean.map((x:any)=><div key={x.label} style={{display:"grid",gridTemplateColumns:"7px minmax(0,1fr) auto",gap:5,alignItems:"center"}}><span style={{width:7,height:7,borderRadius:999,background:x.color}}/><span style={{color:SOFT,fontSize:7.2,fontWeight:850,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{x.label}</span><span style={{color:x.color,fontSize:8,fontWeight:1000}}>{x.value}</span></div>)}</div></div></div>;
}
function EndCompareBars({ rows, total }: any) {
  const max = Math.max(1, ...(rows || []).map((r: any) => Number(r?.cellsRevealed || 0)));
  return <div style={{display:"grid",gap:6}}>{(rows || []).map((r:any)=><div key={r.id}><div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:7.8}}><span style={{color:"#e7e9ef",fontWeight:950,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.name}</span><span style={{color:r.win?GOOD:GOLD,fontWeight:1000}}>{Number(r.cellsRevealed||0)} cases · {Math.round(Number(r.hitRate||0)*100)}%</span></div><div style={{height:6,marginTop:3,borderRadius:999,background:"rgba(255,255,255,.06)",overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,(Number(r.cellsRevealed||0)/max)*100)}%`,borderRadius:999,background:r.win?GOOD:GOLD,boxShadow:`0 0 10px ${r.win?GOOD:GOLD}44`}}/></div></div>)}</div>;
}

function EndTabIcon({ name, size = 21 }: any) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (name === "summary") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M3 11.5 12 4l9 7.5"/><path {...p} d="M5 10.5V20h14v-9.5"/></svg>;
  if (name === "ranking") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M8 5h8v3a4 4 0 0 1-8 0V5Z"/><path {...p} d="M6 5H4v2a4 4 0 0 0 4 4"/><path {...p} d="M18 5h2v2a4 4 0 0 1-4 4"/><path {...p} d="M12 12v3"/><path {...p} d="M9 20h6"/><path {...p} d="M10 15h4"/></svg>;
  if (name === "performance") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M4 20V11"/><path {...p} d="M10 20V5"/><path {...p} d="M16 20v-8"/><path {...p} d="M22 20V8"/></svg>;
  if (name === "darts") return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="7"/><circle {...p} cx="12" cy="12" r="3.2"/><path {...p} d="M12 5V3"/><path {...p} d="M19 12h2"/><path {...p} d="M12 21v-2"/><path {...p} d="M3 12h2"/></svg>;
  if (name === "charts") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M4 19V5"/><path {...p} d="M4 19h16"/><path {...p} d="m7 15 4-4 3 2 5-6"/><circle cx="7" cy="15" r="1" fill="currentColor"/><circle cx="11" cy="11" r="1" fill="currentColor"/><circle cx="14" cy="13" r="1" fill="currentColor"/><circle cx="19" cy="7" r="1" fill="currentColor"/></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="9" cy="8" r="3"/><circle {...p} cx="17" cy="9" r="2.5"/><path {...p} d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path {...p} d="M14 16.5a4.5 4.5 0 0 1 6.5 3.5"/></svg>;
}

function EndTabNav({ active, setActive, participantMode, accent }: any) {
  const tabs = [
    { id: "summary", label: "Résumé" },
    { id: "ranking", label: "Classement" },
    { id: "performance", label: "Performance" },
    { id: "darts", label: "Darts" },
    { id: "charts", label: "Graphiques" },
    ...(participantMode === "teams" ? [{ id: "teams", label: "Équipes" }] : []),
  ];
  return <div style={{ marginTop: 11, borderTop: "1px solid rgba(255,255,255,.07)", borderBottom: "1px solid rgba(255,255,255,.07)", background: "rgba(5,8,14,.72)", overflowX: "auto", scrollbarWidth: "none" }}>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${tabs.length},minmax(62px,1fr))`, minWidth: tabs.length > 5 ? 372 : 320 }}>
      {tabs.map((tab: any) => {
        const selected = active === tab.id;
        return <button key={tab.id} type="button" onClick={() => setActive(tab.id)} style={{ position: "relative", minWidth: 0, minHeight: 57, padding: "7px 3px 8px", border: 0, background: selected ? `linear-gradient(180deg,color-mix(in srgb, ${accent} 10%, transparent),transparent)` : "transparent", color: selected ? accent : "rgba(226,232,240,.70)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <span style={{ display: "grid", placeItems: "center", filter: selected ? `drop-shadow(0 0 7px ${accent}66)` : "none" }}><EndTabIcon name={tab.id} size={21}/></span>
          <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "clamp(6.7px,1.75vw,8.6px)", fontWeight: selected ? 1000 : 850, lineHeight: 1 }}>{tab.label}</span>
          <span style={{ position: "absolute", left: "18%", right: "18%", bottom: 0, height: 2, borderRadius: 999, background: selected ? accent : "transparent", boxShadow: selected ? `0 0 8px ${accent}88` : "none" }}/>
        </button>;
      })}
    </div>
  </div>;
}

function LoterieEndPanel({ finalPlayers, winnerId, events, config, accent, onReplay, onStats, onMenu }: any) {
  const built = React.useMemo(() => buildLoterieSummaries(finalPlayers || [], winnerId, events || [], config || {}), [finalPlayers, winnerId, events, config]);
  const participantMode = config?.participantMode === "teams" ? "teams" : "players";
  const rows = participantMode === "teams" ? built.teamRows : built.entityRows;
  const winnerRow = rows.find((row: any) => row.win) || rows[0] || null;
  const winnerPlayers = built.playerRows.filter((row: any) => row.win);
  const variantLabel = config?.variant === "express" ? `1 FLÉCHETTE · ${String(config?.expressTarget || "simple").toUpperCase()}` : `${config?.volleyMode === "strict3" ? "3 FLÉCHETTES" : "1–3 FLÉCHETTES"} · VOLÉE`;
  const [activeTab, setActiveTab] = React.useState("summary");
  const statsFocusId = winnerPlayers?.[0]?.id || winnerRow?.id;

  return <div style={{ position: "fixed", inset: 0, zIndex: 10030, background: "rgba(0,0,0,.86)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 10 }}>
    <div style={{ width: "min(760px,98vw)", maxHeight: "94dvh", overflowY: "auto", borderRadius: 23, border: `1px solid ${accent}80`, background: "linear-gradient(180deg,#17130b,#0b0c10 34%,#07080b)", padding: 13, boxShadow: "0 30px 90px rgba(0,0,0,.65)" }} className="dc-scroll-thin">
      <div style={{ textAlign: "center" }}>
        <img src={victoryImage} alt="Victoire" style={{ width: 66, height: 66, objectFit: "contain", display: "block", margin: "-3px auto -5px", filter: `drop-shadow(0 0 14px ${accent}44)` }} />
        <div style={{ color: accent, fontSize: 12, fontWeight: 1000, letterSpacing: 1.6 }}>JACKPOT — CARTON COMPLET</div>
        <div style={{ marginTop: 4, fontSize: 23, fontWeight: 1000 }}>{winnerRow?.name || "Vainqueur"}</div>
        <div style={{ marginTop: 4, color: SOFT, fontSize: 9.5 }}>{participantMode === "teams" ? "MODE ÉQUIPES" : "MODE JOUEURS"} · {variantLabel} · {config?.cardsPerPlayer || 1} carton{Number(config?.cardsPerPlayer || 1) > 1 ? "s" : ""} · {config?.cellsPerCard || 10} cases</div>
      </div>

      <EndTabNav active={activeTab} setActive={setActiveTab} participantMode={participantMode} accent={accent}/>

      <div style={{ minHeight: 330, paddingTop: 11 }}>
        {activeTab === "summary" ? <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
            <EndStat label="Tours" value={built.matchStats.visits} tone={CYAN} />
            <EndStat label="Darts" value={built.matchStats.dartsThrown} tone={CYAN} />
            <EndStat label="Découverte" value={`${Math.round((built.matchStats.hitRate || 0) * 100)}%`} tone={GOOD} />
            <EndStat label="Multi-hits" value={built.matchStats.multiHits} tone={PINK} />
          </div>
          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
            <EndStat label="Cases / tour" value={Number(built.matchStats.avgCellsPerVisit || 0).toFixed(2)} tone={GOOD} />
            <EndStat label="Volée moy." value={Number(built.matchStats.averageVolley || 0).toFixed(1)} tone={CYAN} />
            <EndStat label="Meilleure volée" value={built.matchStats.maxVolley} tone={accent} />
            <EndStat label="Meilleur hit" value={`${built.matchStats.maxCellsInVisit} case${built.matchStats.maxCellsInVisit > 1 ? "s" : ""}`} tone={PINK} />
          </div>
          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}>
            <EndStat label="1 CASE" value={built.matchStats.hit1 || 0} tone={GOOD}/>
            <EndStat label="2 CASES" value={built.matchStats.hit2 || 0} tone={PINK}/>
            <EndStat label="3+ JACKPOT" value={built.matchStats.hit3plus || 0} tone={accent}/>
            <EndStat label="SÉRIE VIDE" value={built.matchStats.longestEmptyStreak || 0} tone={BAD}/>
          </div>
          <div style={{ marginTop: 10, padding: 10, borderRadius: 14, border: `1px solid ${accent}33`, background: `color-mix(in srgb, ${accent} 5%, transparent)` }}>
            <div style={{ color: accent, fontSize: 8.5, fontWeight: 1000, letterSpacing: .6 }}>VAINQUEUR</div>
            <div style={{ marginTop: 5, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}><strong style={{ fontSize: 17 }}>{winnerRow?.name || "—"}</strong><span style={{ color: GOOD, fontWeight: 1000, fontSize: 11 }}>{Number(winnerRow?.bestCardProgress || 0)}/{Number(winnerRow?.cellsPerCard || config?.cellsPerCard || 10)} · {Number(winnerRow?.cellsRevealed || 0)} cases</span></div>
          </div>
        </> : null}

        {activeTab === "ranking" ? <>
          <div style={{ color: accent, fontSize: 10, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .8 }}>Classement final</div>
          <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
            {rows.map((row: any) => <div key={row.id} style={{ display: "grid", gridTemplateColumns: "32px minmax(0,1.35fr) repeat(5,minmax(42px,.55fr))", gap: 5, alignItems: "center", padding: "8px 7px", borderRadius: 13, border: `1px solid ${row.win ? `${accent}70` : "rgba(255,255,255,.07)"}`, background: row.win ? `color-mix(in srgb, ${accent} 9%, transparent)` : "rgba(255,255,255,.025)" }}>
              <div style={{ color: row.rank === 1 ? accent : SOFT, fontWeight: 1000, textAlign: "center" }}>#{row.rank}</div>
              <div style={{ minWidth: 0 }}><div style={{ fontSize: 11, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}{row.win ? " · WIN" : ""}</div><div style={{ marginTop: 2, color: SOFT, fontSize: 8.2 }}>{Number(row.bestCardProgress || 0)}/{Number(row.cellsPerCard || config?.cellsPerCard || 10)} meilleur carton</div></div>
              {[["CASES", row.cellsRevealed], ["HIT%", `${Math.round(Number(row.hitRate || 0) * 100)}%`], ["MULTI", row.multiHits], ["SÉRIE", row.bestStreak], ["BEST", row.maxVolley]].map(([label, value]: any) => <div key={label} style={{ minWidth: 0, textAlign: "center" }}><div style={{ color: SOFT, fontSize: 6.7, fontWeight: 900 }}>{label}</div><div style={{ marginTop: 2, color: label === "HIT%" ? GOOD : accent, fontSize: 11, fontWeight: 1000, whiteSpace: "nowrap" }}>{value}</div></div>)}
            </div>)}
          </div>
          <div style={{ marginTop: 11, padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.022)" }}><div style={{ color: accent, fontSize: 8.5, fontWeight: 1000, letterSpacing: .6, marginBottom: 7 }}>COMPARATEUR DES PARTICIPANTS</div><EndCompareBars rows={rows}/></div>
        </> : null}

        {activeTab === "performance" ? <>
          <div style={{ color: GOOD, fontSize: 10, fontWeight: 1000, letterSpacing: .8 }}>RENDEMENT & CARTONS</div>
          <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
            <EndStat label="Tours trouvés" value={built.matchStats.successfulVisits} tone={GOOD}/>
            <EndStat label="Tours vides" value={built.matchStats.emptyVisits} tone={BAD}/>
            <EndStat label="Cases / 100 darts" value={Number(built.matchStats.cellsPer100Darts || 0).toFixed(1)} tone={CYAN}/>
            <EndStat label="Multi rate" value={`${Math.round(Number(built.matchStats.multiRate || 0) * 100)}%`} tone={PINK}/>
          </div>
          <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
            <EndStat label="Cartons joués" value={built.matchStats.cardsPlayed || 0} tone={accent}/>
            <EndStat label="Cartons finis" value={built.matchStats.cardsCompleted || 0} tone={GOOD}/>
            <EndStat label="Progression moy." value={Number(built.matchStats.averageCardProgress || 0).toFixed(1)} tone={CYAN}/>
            <EndStat label="Presque finis" value={built.matchStats.nearCompleteCards || 0} tone={PINK}/>
          </div>
          <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
            <EndStat label="Série positive" value={built.matchStats.bestStreak || 0} tone={GOOD}/>
            <EndStat label="Série vide" value={built.matchStats.longestEmptyStreak || 0} tone={BAD}/>
            <EndStat label="Volée hit moy." value={Number(built.matchStats.avgSuccessfulVolley || 0).toFixed(1)} tone={CYAN}/>
            <EndStat label="Volée miss moy." value={Number(built.matchStats.avgMissedVolley || 0).toFixed(1)} tone={BAD}/>
          </div>
          <div style={{ marginTop: 10 }}><EndPie3D title="TOURS · DÉCOUVERTE" center={`${Math.round(Number(built.matchStats.hitRate||0)*100)}%`} centerLabel="HIT RATE" items={[{label:"Avec découverte",value:built.matchStats.successfulVisits,color:GOOD},{label:"À vide",value:built.matchStats.emptyVisits,color:BAD}]}/></div>
        </> : null}

        {activeTab === "darts" ? <>
          <div style={{ color: CYAN, fontSize: 10, fontWeight: 1000, letterSpacing: .8 }}>IMPACTS & QUALITÉ DES DARTS</div>
          <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 5 }}>
            <EndStat label="S" value={built.matchStats.singles} tone={CYAN} />
            <EndStat label="D" value={built.matchStats.doubles} tone={GOOD} />
            <EndStat label="T" value={built.matchStats.triples} tone={PINK} />
            <EndStat label="BULL" value={built.matchStats.bulls} tone={accent} />
            <EndStat label="DBULL" value={built.matchStats.dbulls} tone={accent} />
            <EndStat label="MISS" value={built.matchStats.dartMisses} tone={BAD} />
          </div>
          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
            <EndStat label="Pts darts" value={built.matchStats.dartPoints || 0} tone={accent}/>
            <EndStat label="Score / dart" value={Number(built.matchStats.averageDartScore || 0).toFixed(1)} tone={CYAN}/>
            <EndStat label="Darts cible" value={`${Math.round(Number(built.matchStats.dartOnBoardRate || 0) * 100)}%`} tone={GOOD}/>
            <EndStat label="Scores uniques" value={built.matchStats.uniqueScores || 0} tone={PINK}/>
          </div>
          <div style={{ marginTop: 10 }}><EndPie3D title="IMPACTS DE DARTS" center={built.matchStats.dartsThrown} centerLabel="DARTS" items={[{label:"Simple",value:built.matchStats.singles,color:CYAN},{label:"Double",value:built.matchStats.doubles,color:GOOD},{label:"Triple",value:built.matchStats.triples,color:PINK},{label:"Bull",value:Number(built.matchStats.bulls||0)+Number(built.matchStats.dbulls||0),color:accent},{label:"Miss",value:built.matchStats.dartMisses,color:BAD}]}/></div>
        </> : null}

        {activeTab === "charts" ? <>
          <div style={{ color: accent, fontSize: 10, fontWeight: 1000, letterSpacing: .8 }}>GRAPHIQUES DU MATCH</div>
          <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
            <EndPie3D title="TOURS · DÉCOUVERTE" center={`${Math.round(Number(built.matchStats.hitRate||0)*100)}%`} centerLabel="HIT RATE" items={[{label:"Avec découverte",value:built.matchStats.successfulVisits,color:GOOD},{label:"À vide",value:built.matchStats.emptyVisits,color:BAD}]}/>
            <EndPie3D title="IMPACTS DE DARTS" center={built.matchStats.dartsThrown} centerLabel="DARTS" items={[{label:"Simple",value:built.matchStats.singles,color:CYAN},{label:"Double",value:built.matchStats.doubles,color:GOOD},{label:"Triple",value:built.matchStats.triples,color:PINK},{label:"Bull",value:Number(built.matchStats.bulls||0)+Number(built.matchStats.dbulls||0),color:accent},{label:"Miss",value:built.matchStats.dartMisses,color:BAD}]}/>
          </div>
          <div style={{ marginTop: 10, padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.022)" }}><div style={{ color: accent, fontSize: 8.5, fontWeight: 1000, letterSpacing: .6, marginBottom: 7 }}>CASES DÉCOUVERTES PAR PARTICIPANT</div><EndCompareBars rows={rows}/></div>
          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}><EndStat label="0 CASE" value={built.matchStats.hit0 || 0} tone={BAD}/><EndStat label="1 CASE" value={built.matchStats.hit1 || 0} tone={GOOD}/><EndStat label="2 CASES" value={built.matchStats.hit2 || 0} tone={PINK}/><EndStat label="3+ JACKPOT" value={built.matchStats.hit3plus || 0} tone={accent}/></div>
        </> : null}

        {activeTab === "teams" && participantMode === "teams" ? <>
          <div style={{ color: CYAN, fontSize: 10, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .8 }}>Contributions des joueurs</div>
          <div style={{ marginTop: 6, display: "grid", gap: 5 }}>{[...built.playerRows].sort((a: any,b: any)=>a.rank-b.rank || b.cellsRevealed-a.cellsRevealed).map((row: any) => <div key={`${row.teamId}:${row.id}`} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) repeat(5,minmax(38px,.55fr))", gap: 5, alignItems: "center", padding: "7px 8px", borderRadius: 12, background: row.win ? `color-mix(in srgb, ${accent} 7%, transparent)` : "rgba(255,255,255,.025)", border: `1px solid ${row.win ? `${accent}44` : "rgba(255,255,255,.06)"}` }}><div style={{ minWidth: 0 }}><div style={{ fontWeight: 950, fontSize: 9.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div><div style={{ color: SOFT, fontSize: 7.5 }}>{row.teamName}</div></div>{[["CASES",row.cellsRevealed],["TOURS",row.visits],["DARTS",row.dartsThrown],["HIT%",`${Math.round(Number(row.hitRate||0)*100)}%`],["AVG",Number(row.averageVolley||0).toFixed(1)]].map(([l,v]:any)=><div key={l} style={{textAlign:"center"}}><div style={{color:SOFT,fontSize:6.5,fontWeight:900}}>{l}</div><div style={{color:l==="HIT%"?GOOD:CYAN,fontSize:10,fontWeight:1000,marginTop:1}}>{v}</div></div>)}</div>)}</div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
            <EndStat label="Équipes" value={built.matchStats.teamCount || rows.length} tone={accent}/>
            <EndStat label="Joueurs" value={built.matchStats.playerCount || built.playerRows.length} tone={CYAN}/>
            <EndStat label="Cases équipe" value={built.matchStats.cellsRevealed || 0} tone={GOOD}/>
            <EndStat label="Multi équipe" value={built.matchStats.multiHits || 0} tone={PINK}/>
          </div>
        </> : null}
      </div>

      <div style={{ position: "sticky", bottom: -13, zIndex: 4, margin: "12px -3px -3px", padding: "9px 3px 3px", background: "linear-gradient(180deg,rgba(7,8,11,0),#07080b 30%)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
          <button onClick={onReplay} style={{ minHeight: 43, borderRadius: 13, border: `1px solid ${accent}`, background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent, fontWeight: 1000 }}>REJOUER</button>
          <button onClick={() => onStats?.(statsFocusId)} style={{ minHeight: 43, borderRadius: 13, border: `1px solid ${CYAN}70`, background: "rgba(69,216,255,.08)", color: CYAN, fontWeight: 1000 }}>STATS</button>
          <button onClick={onMenu} style={{ minHeight: 43, borderRadius: 13, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontWeight: 1000 }}>MENU</button>
        </div>
      </div>
    </div>
  </div>;
}

export default function LoteriePlay({ setTab, go, store, params, onFinish }: any) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const config: LoterieConfig & any = { ...DEFAULT_CONFIG, ...(params?.config || {}) };
  const sourcePlayers = Array.isArray(params?.players) && params.players.length ? params.players : makeFallbackPlayers(store);
  const createdAtRef = React.useRef(Number(params?.createdAt) || Date.now());
  const [seed, setSeed] = React.useState(() => Date.now());
  const [players, setPlayers] = React.useState<LoteriePlayerState[]>(() => buildPlayerStates(sourcePlayers, config, seed));
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [darts, setDarts] = React.useState<LoterieDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const multiplierRef = React.useRef<1 | 2 | 3>(1);
  const [scoreReveal, setScoreReveal] = React.useState<any>(null);
  const [winnerId, setWinnerId] = React.useState<string | null>(null);
  const [events, setEvents] = React.useState<any[]>([]);
  const [recentRevealKeys, setRecentRevealKeys] = React.useState<string[]>([]);
  const [cardsOpen, setCardsOpen] = React.useState(false);
  const [cardsInitialIndex, setCardsInitialIndex] = React.useState(0);
  const [rankingOpen, setRankingOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [statsOpen, setStatsOpen] = React.useState(false);
  const [botThinking, setBotThinking] = React.useState(false);
  const finishSent = React.useRef(false);

  const participantMode = config?.participantMode === "teams" || params?.participantMode === "teams" ? "teams" : "players";
  const active = players[activeIndex] || players[0];
  const activeMember = participantMode === "teams" && Array.isArray((active as any)?.members) && (active as any).members.length
    ? (active as any).members[(Number(active?.stats?.visits || 0)) % (active as any).members.length]
    : null;
  const activeTurnActor = activeMember || active;
  const winner = winnerId ? players.find((p) => p.id === winnerId) || null : null;
  const ranking = React.useMemo(() => [...players].sort((a, b) => bestCardProgress(b) - bestCardProgress(a) || b.stats.cellsRevealed - a.stats.cellsRevealed), [players]);
  const bestIdx = active?.cards?.length ? active.cards.reduce((bestI, c, i, arr) => cardProgress(c) > cardProgress(arr[bestI]) ? i : bestI, 0) : 0;
  const bestProgress = active ? bestCardProgress(active) : 0;
  const cardTotal = active?.cards?.[0]?.cells?.length || config.cellsPerCard;
  const lastPlayerEvent = React.useMemo(() => [...events].reverse().find((e: any) => e.playerId === active?.id) || null, [events, active?.id]);
  const recentScores = React.useMemo(() => recentScoreItems(events, active?.id, 5), [events, active?.id]);
  const remainingForWin = Math.max(0, cardTotal - bestProgress);
  const lastVolleyText = config.variant === "classic"
    ? (darts.length ? `${darts.map((d: any) => dartLabel(d)).join(" + ")} = ${volleyScore(darts)}` : (lastPlayerEvent?.darts?.length ? `${lastPlayerEvent.darts.map((d: any) => d.label).join(" + ")} = ${lastPlayerEvent.volleyScore}` : "—"))
    : (darts[0] ? dartLabel(darts[0]) : (lastPlayerEvent?.darts?.[0]?.label || "—"));

  React.useEffect(() => {
    if (!scoreReveal) return;
    const id = window.setTimeout(() => setScoreReveal(null), SCORE_REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [scoreReveal]);
  React.useEffect(() => {
    if (!recentRevealKeys.length) return;
    const id = window.setTimeout(() => setRecentRevealKeys([]), 1200);
    return () => window.clearTimeout(id);
  }, [recentRevealKeys]);

  React.useEffect(() => {
    multiplierRef.current = 1;
    setMultiplier(1);
  }, [activeIndex]);

  React.useEffect(() => {
    if (!active || winnerId || scoreReveal || !isBotLike(activeTurnActor) || botThinking) return;
    let cancelled = false;
    setBotThinking(true);
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const turn = config.variant === "express" ? [randomBotDart(activeTurnActor)] : Array.from({ length: config.volleyMode === "strict3" ? 3 : 1 + Math.floor(Math.random() * 3) }, () => randomBotDart(activeTurnActor));
      commitTurn(turn);
      setBotThinking(false);
    }, 720);
    return () => { cancelled = true; window.clearTimeout(timer); setBotThinking(false); };
  }, [activeIndex, winnerId, scoreReveal, active?.id, activeMember?.id, events.length]);

  function finish(finalPlayers: LoteriePlayerState[], winId: string, finalEvents: any[]) {
    if (finishSent.current) return;
    finishSent.current = true;
    setWinnerId(winId);
    const finishedAt = Date.now();
    const built = buildLoterieSummaries(finalPlayers, winId, finalEvents, { ...config, participantMode });
    const win = finalPlayers.find((p) => p.id === winId);
    const winnerPlayerIds = participantMode === "teams"
      ? built.playerRows.filter((row: any) => row.win).map((row: any) => row.playerId)
      : [winId];
    const durationMs = Math.max(0, finishedAt - createdAtRef.current);
    const summary = {
      kind: "loterie", mode: "loterie", sport: "darts", finished: true,
      statisticsVersion: 3, participantMode, variant: config.variant, expressTarget: config.expressTarget,
      winnerId: winId, winnerEntityId: winId, winnerPlayerIds, winnerName: win?.name || "",
      config: { ...config, participantMode },
      players: built.playerRows, perPlayer: built.playerRows,
      teams: built.teamRows, entities: built.entityRows, standings: built.entityRows, rankings: built.entityRows,
      matchStats: { ...built.matchStats, durationMs },
      duration: durationMs, durationMs,
      scoreLine: built.entityRows.map((row: any) => `${row.name} ${row.bestCardProgress}/${row.cellsPerCard} · ${row.cellsRevealed} cases`).join(" • "),
    };
    const record = {
      id: `loterie_${createdAtRef.current}_${Math.random().toString(36).slice(2, 8)}`,
      matchId: `loterie_${createdAtRef.current}`,
      kind: "loterie", mode: "loterie", sport: "darts", variant: config.variant, status: "finished",
      participantMode, players: built.playerRows, teams: built.teamRows,
      winnerId: winId, winnerEntityId: winId, winnerPlayerIds, winnerName: win?.name || "",
      createdAt: createdAtRef.current, startedAt: createdAtRef.current, updatedAt: finishedAt, finishedAt, endedAt: finishedAt,
      summary,
      payload: {
        kind: "loterie", mode: "loterie", sport: "darts", gameId: "loterie", statisticsVersion: 3,
        participantMode, winnerId: winId, winnerEntityId: winId, winnerPlayerIds,
        config: { ...config, participantMode }, players: built.playerRows, teams: built.teamRows, entities: built.entityRows,
        stats: { mode: "loterie", sport: "darts", participantMode, variant: config.variant, players: built.playerRows, teams: built.teamRows, entities: built.entityRows, global: { ...built.matchStats, durationMs } },
        summary, events: finalEvents, visitHistory: finalEvents,
      },
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
    const revealedCardNumbers = resolved.player.cards
      .map((card: any, cardIdx: number) => changedKeys.some((key: string) => key.startsWith(`${card.id}:`)) ? cardIdx + 1 : null)
      .filter((n: number | null): n is number => n != null);
    const currentMember = participantMode === "teams" && Array.isArray((current as any)?.members) && (current as any).members.length
      ? (current as any).members[(Number(current?.stats?.visits || 0)) % (current as any).members.length]
      : null;
    const ev = {
      ts: Date.now(), participantMode,
      playerId: current.id, playerName: current.name, entityId: current.id,
      teamEntityId: participantMode === "teams" ? current.id : null,
      teamId: participantMode === "teams" ? ((current as any).teamId || current.id) : null,
      teamName: participantMode === "teams" ? current.name : null,
      actorId: currentMember?.id || current.id, memberId: currentMember?.id || null,
      actorName: currentMember?.name || current.name, memberName: currentMember?.name || null,
      darts: turnDarts.map((d) => ({ ...d, label: dartLabel(d), score: dartScore(d) })),
      volleyScore: volleyScore(turnDarts), resultKey: resolved.result.key, resultLabel: resolved.result.label,
      revealed: resolved.revealed, revealedCardNumbers, completedCardIds: resolved.completedCardIds,
    };
    const nextEvents = [...events, ev];
    setEvents(nextEvents);
    setPlayers(nextPlayers);
    setDarts([]);
    setRecentRevealKeys(changedKeys);
    const resultScore = Math.round(Number(resolved?.result?.value ?? volleyScore(turnDarts)) || 0);
    const found = resolved.revealed > 0;
    setScoreReveal({
      score: resultScore,
      label: resolved?.result?.label || String(resultScore),
      good: found,
      revealed: resolved.revealed,
      cardNumbers: revealedCardNumbers,
      ts: Date.now(),
    });
    // Réutilise exactement les sons des tickers GOLF demandés : MISS si aucune
    // case n'est trouvée, PAR dès qu'au moins un numéro est découvert.
    playLoterieGolfTickerSfx(found);
    if (didWin) {
      finish(nextPlayers, current.id, nextEvents);
      return;
    }
    setActiveIndex((activeIndex + 1) % nextPlayers.length);
  }

  function selectMultiplier(next: 1 | 2 | 3) {
    multiplierRef.current = next;
    setMultiplier(next);
  }
  function resetMultiplier() {
    multiplierRef.current = 1;
    setMultiplier(1);
  }

  function addDart(value: number, forcedMult?: number) {
    if (winnerId || botThinking) return;
    const mult = value === 0 ? 1 : (forcedMult || multiplierRef.current);
    const dart: LoterieDart = { v: Number(value) || 0, mult: mult as any };
    if (config.variant === "express") {
      setDarts([dart]);
      // Même comportement que X01 : D/T ne vaut que pour la fléchette saisie.
      resetMultiplier();
      window.setTimeout(() => commitTurn([dart]), 70);
      return;
    }
    if (darts.length >= 3) return;
    const next = [...darts, dart];
    setDarts(next);
    // X01 repasse toujours en SIMPLE après chaque hit.
    resetMultiplier();
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
    // Comme X01 : une annulation remet aussi la saisie sur SIMPLE.
    resetMultiplier();
  }
  function resetGame() {
    const nextSeed = Date.now();
    setSeed(nextSeed);
    setPlayers(buildPlayerStates(sourcePlayers, config, nextSeed));
    setActiveIndex(0); setDarts([]); setWinnerId(null); setEvents([]); setRecentRevealKeys([]); setScoreReveal(null); setCardsOpen(false); setRankingOpen(false); setHistoryOpen(false); setStatsOpen(false); setBotThinking(false);
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
  function openHistory() {
    setHistoryOpen(true);
  }

  const activeAvatarProfile = activeTurnActor ? { ...activeTurnActor, avatarDataUrl: avatarOf(activeTurnActor), avatarUrl: avatarOf(activeTurnActor) } : null;
  const themeAccent = theme?.primary || GOLD;
  const accent = themeAccent;
  const bestCardBackground = React.useMemo(() => {
    if (config?.variant !== "express") return bestCardBackgroundClassic;
    if (config?.expressTarget === "simple") return bestCardBackgroundSimple;
    if (config?.expressTarget === "double") return bestCardBackgroundDouble;
    if (config?.expressTarget === "triple") return bestCardBackgroundTriple;
    return bestCardBackgroundClassic;
  }, [config?.variant, config?.expressTarget]);

  return (
    <div style={{ minHeight: "100dvh", color: theme?.text || "#fff", background: `radial-gradient(circle at 50% -5%, color-mix(in srgb, ${themeAccent} 14%, transparent) 0, ${theme?.bg || "#080c17"} 46%, #020309 100%)`, paddingBottom: 8, overflowX: "hidden" }}>
      <style>{`
        @keyframes lotScratchReveal { 0% { transform: scale(.86) rotate(-4deg); filter: brightness(1.15);} 55% { transform: scale(1.04) rotate(1deg);} 100% { transform: scale(1) rotate(0deg); filter: brightness(1);} }
        @keyframes lotStampPop { 0% { opacity: 0; transform: scale(.35) rotate(-20deg);} 75% { opacity: 1; transform: scale(1.12) rotate(-8deg);} 100% { opacity: 1; transform: scale(1) rotate(-8deg);} }
        @keyframes lotFxBurst { 0% { opacity: 0; transform: translate(-50%,-30%) scale(.72);} 12% { opacity: 1;} 100% { opacity: 0; transform: translate(-50%,-54%) scale(1.08);} }
        @keyframes lotScoreBackdrop { 0% { opacity: 0; } 8% { opacity: 1; } 90% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes lotScoreCardReveal { 0% { opacity: 0; transform: translateY(22px) scale(.68) rotate(-3deg); } 12% { opacity: 1; transform: translateY(0) scale(1.06) rotate(1deg); } 22% { transform: scale(.99) rotate(0deg); } 90% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.03); } }
        @keyframes lotMaterialAura { from { opacity: .34; transform: scale(.96); } to { opacity: .68; transform: scale(1.12); } }
        @keyframes lotCardShine { 0% { transform: translateX(-120%); opacity: 0;} 18% { opacity: 1;} 100% { transform: translateX(120%); opacity: 0;} }
      `}</style>
      <PageHeader
        tickerSrc={tickerLoterie}
        tickerAlt="LOTERIE"
        tickerHeight={92}
        tickerFit="cover"
        tickerBottomGap={10}
        left={<div style={{ marginLeft: 6 }}><BackDot onClick={backToConfig} color={themeAccent} glow={`${themeAccent}88`} title="Retour à la configuration" /></div>}
        right={<div style={{ marginRight: 6 }}><InfoDot title="Règles LOTERIE" color={themeAccent} glow={`${themeAccent}77`} content={<RulesContent config={config} accent={themeAccent} />} /></div>}
      />

      <div style={{ padding: "8px 8px 8px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
        <section style={{ ...panelStyle(), marginBottom: 7, padding: 0, overflow: "hidden", borderColor: `${accent}88`, boxShadow: `0 0 24px ${accent}20` }}>
          <div style={{ position: "relative", minHeight: 126, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(126px,138px)", gap: 4, alignItems: "stretch", padding: "8px 10px" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.36), rgba(0,0,0,.18) 36%, rgba(0,0,0,.10) 62%, rgba(0,0,0,.30))" }} />
            <div style={{ position: "absolute", left: -20, top: -4, bottom: -4, width: "24%", minWidth: 82, overflow: "hidden", opacity: .15, pointerEvents: "none" }}>
              <div style={{ position: "absolute", left: -16, top: 16, transform: "scale(1.22)", transformOrigin: "left top", filter: "saturate(.86)" }}>{activeAvatarProfile ? <ProfileAvatar profile={activeAvatarProfile as any} size={82} /> : null}</div>
            </div>
            <div style={{ gridColumn: "1 / 2", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", minWidth: 0, textAlign: "center", padding: "7px 10px 4px 6px" }}>
              {botThinking ? <div style={{ color: accent, fontSize: 10.5, fontWeight: 1000, letterSpacing: 1, marginBottom: 2 }}>BOT EN RÉFLEXION</div> : null}
              <div style={{ color: accent, fontSize: 14, fontWeight: 1000, letterSpacing: .8, lineHeight: 1.02, maxWidth: "100%", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameOf(activeTurnActor)}</div>
              {participantMode === "teams" && activeMember ? <div style={{ marginTop: 2, color: SOFT, fontSize: 8.2, fontWeight: 900, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameOf(active)} · joueur {(Number(active?.stats?.visits || 0) % Math.max(1, (active as any)?.members?.length || 1)) + 1}/{Math.max(1, (active as any)?.members?.length || 1)}</div> : null}
              <div style={{ marginTop: 5, color: "#ffcf57", fontSize: 58, fontWeight: 900, lineHeight: 1, textShadow: "0 4px 18px rgba(255,195,26,.25)", whiteSpace: "nowrap" }}>{remainingForWin}</div>
              <div style={{ marginTop: "auto", display: "flex", gap: "clamp(4px, 1.6vw, 13px)", alignItems: "center", justifyContent: "center", flexWrap: "nowrap", width: "100%", minWidth: 0, overflow: "hidden" }}>
                <ModeInlineInfo kind="darts" value={config.variant === "classic" ? "3 darts" : "Express"} accent={accent} />
                <ModeInlineInfo kind="range" value={config.variant === "classic" ? `${active?.targetMin}–${active?.targetMax}` : config.expressTarget.toUpperCase()} accent={accent} />
                <ModeInlineInfo kind="cards" value={`${config.cardsPerPlayer} carton${config.cardsPerPlayer > 1 ? "s" : ""}`} accent={accent} />
              </div>
            </div>
            <button type="button" onClick={() => openCards(bestIdx)} style={{ gridColumn: "2 / 3", position: "relative", zIndex: 2, minWidth: 0, overflow: "hidden", borderRadius: 18, border: `1px solid ${themeAccent}55`, background: "#080b12", cursor: "pointer", padding: 0, color: "#fff" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(180deg, rgba(4,8,16,.20), rgba(4,8,16,.66)), url(${bestCardBackground})`, backgroundPosition: "center 48%", backgroundSize: "cover", opacity: .92, filter: "saturate(.9) contrast(1.04)" }} />
              <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 28px rgba(0,0,0,.62), inset 0 0 0 1px ${themeAccent}18`, pointerEvents: "none" }} />
              <div style={{ position: "relative", display: "flex", height: "100%", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6px 4px" }}>
                <div style={{ color: SOFT, fontSize: 9.5, fontWeight: 950 }}>MEILLEUR CARTON</div>
                <div style={{ color: themeAccent, fontSize: 28, lineHeight: 1, fontWeight: 1100, marginTop: 5 }}>C{bestIdx + 1}</div>
                <div style={{ color: "rgba(255,255,255,.82)", fontSize: 13, fontWeight: 1000, marginTop: 5 }}>{bestProgress}/{cardTotal}</div>
                <div style={{ color: SOFT, fontSize: 8, marginTop: 5 }}>TOUCHER POUR OUVRIR</div>
              </div>
            </button>
          </div>
        </section>

        <section style={{ ...panelStyle(), padding: 8, marginBottom: 7 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4 }}>
            <MiniKpi label="CASES" value={active?.stats?.cellsRevealed || 0} color={themeAccent} onClick={() => setStatsOpen(true)} />
            <MiniKpi label="TOURS" value={active?.stats?.visits || 0} color={CYAN} onClick={() => setStatsOpen(true)} />
            <MiniKpi label="HITS" value={active?.stats?.successfulVisits || 0} color={GOOD} onClick={() => setStatsOpen(true)} />
            <MiniKpi label="MULTI" value={active?.stats?.multiHits || 0} color={PINK} onClick={() => setStatsOpen(true)} />
          </div>
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 7 }}>
          <button type="button" onClick={() => openCards(bestIdx)} style={{ ...panelStyle(), minHeight: 76, padding: "8px 10px", cursor: "pointer", color: "#fff", textAlign: "left", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><span style={{ color: themeAccent, fontSize: 10, fontWeight: 1000, letterSpacing: .7 }}>CARTONS</span><span style={{ color: themeAccent, fontSize: 9, fontWeight: 900 }}>OUVRIR ›</span></div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, active?.cards?.length || 1)}, minmax(0,1fr))`, gap: 5, marginTop: 8, overflow: "hidden" }}>{active?.cards?.map((card: any, i: number) => <div key={card.id} style={{ minWidth: 0, textAlign: "center", padding: "7px 4px", borderRadius: 12, border: `1px solid color-mix(in srgb, ${themeAccent} ${i === bestIdx ? "76%" : "42%"}, transparent)`, background: `linear-gradient(180deg, color-mix(in srgb, ${themeAccent} ${i === bestIdx ? "24%" : "13%"}, transparent), rgba(255,255,255,.025))`, boxShadow: i === bestIdx ? `0 0 16px color-mix(in srgb, ${themeAccent} 18%, transparent)` : "none" }}><div style={{ color: themeAccent, fontSize: 8.4, fontWeight: 1000, whiteSpace: "nowrap" }}>C{i + 1}</div><div style={{ marginTop: 4, color: "#fff", fontSize: 15, fontWeight: 1000, lineHeight: 1 }}>{cardProgress(card)}</div></div>)}</div>
          </button>
          <button type="button" onClick={() => setRankingOpen(true)} style={{ ...panelStyle(), minHeight: 76, padding: "8px 10px", cursor: "pointer", color: "#fff", textAlign: "left", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><span style={{ color: themeAccent, fontSize: 10, fontWeight: 1000, letterSpacing: .7 }}>CLASSEMENT</span><span style={{ color: themeAccent, fontSize: 9, fontWeight: 900 }}>DÉTAIL ›</span></div>
            <div style={{ marginTop: 7, display: "grid", gap: 3 }}>{ranking.slice(0, 2).map((p, i) => <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, minWidth: 0 }}><span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 9.5, fontWeight: 900 }}>{i + 1}. {p.name}</span><span style={{ flex: "0 0 auto", color: p.id === active?.id ? themeAccent : SOFT, fontSize: 9, fontWeight: 1000 }}>{bestCardProgress(p)}/{p.cards[0]?.cells?.length || config.cellsPerCard}</span></div>)}</div>
          </button>
        </section>

        <section style={{ ...panelStyle(), padding: 8 }}>
          <div style={{ opacity: botThinking || !!scoreReveal ? .45 : 1, pointerEvents: botThinking || !!winnerId || !!scoreReveal ? "none" : "auto" }}>
            <Keypad
              currentThrow={darts as any}
              multiplier={multiplier}
              onSimple={() => selectMultiplier(1)}
              onDouble={() => selectMultiplier(2)}
              onTriple={() => selectMultiplier(3)}
              onBackspace={cancelInput}
              onCancel={cancelInput}
              onNumber={(number) => { const selected = multiplierRef.current; addDart(number, selected); }}
              onBull={() => { const selected = multiplierRef.current === 2 ? 2 : 1; addDart(25, selected); }}
              onValidate={validateVisit}
              hidePreview={false}
              centerSlot={<span style={{ display: "inline-block", minWidth: 58, textAlign: "center", padding: "8px 14px", borderRadius: 14, background: "rgba(255,187,51,.12)", border: "1px solid rgba(255,187,51,.4)", color: "#ffc63a", fontWeight: 900, fontSize: 22, lineHeight: 1, boxShadow: "0 0 16px rgba(255,170,0,.22)" }}>{config.variant === "classic" ? volleyScore(darts) : (darts[0] ? dartLabel(darts[0]) : 0)}</span>}
              noticeSlot={null}
            />
          </div>
        </section>
      </div>

      {cardsOpen && active ? <FloatingCardsModal player={active} initialIndex={cardsInitialIndex} onClose={() => setCardsOpen(false)} recentRevealKeys={recentRevealKeys} lastVolleyText={lastVolleyText} onOpenHistory={openHistory} recentScores={recentScores} accent={themeAccent} /> : null}
      {historyOpen && active ? <ScoreHistoryModal player={active} config={config} events={events} onClose={() => setHistoryOpen(false)} accent={themeAccent} /> : null}
      {statsOpen && active ? <StatsDetailModal player={active} onClose={() => setStatsOpen(false)} accent={themeAccent} /> : null}

      {rankingOpen ? <div role="dialog" aria-modal="true" onClick={() => setRankingOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.72)", backdropFilter: "blur(7px)", display: "grid", placeItems: "center", padding: 14 }}><div onClick={(e) => e.stopPropagation()} style={{ ...panelStyle(), width: "min(520px,100%)", maxHeight: "78dvh", overflowY: "auto", padding: 13, borderColor: `${themeAccent}55` }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><div style={{ color: themeAccent, fontWeight: 1000, letterSpacing: .8 }}>CLASSEMENT LOTERIE</div><button type="button" onClick={() => setRankingOpen(false)} style={carouselBtnStyle(themeAccent)}>×</button></div><div style={{ display: "grid", gap: 7, marginTop: 10 }}>{ranking.map((p, i) => <div key={p.id} style={{ display: "grid", gridTemplateColumns: "32px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 13, background: p.id === active?.id ? `color-mix(in srgb, ${themeAccent} 9%, transparent)` : "rgba(255,255,255,.035)", border: `1px solid ${p.id === active?.id ? themeAccent + "55" : "rgba(255,255,255,.07)"}` }}><div style={{ color: i === 0 ? themeAccent : SOFT, fontSize: 16, fontWeight: 1000, textAlign: "center" }}>{i + 1}</div><div style={{ minWidth: 0 }}><div style={{ fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div><div style={{ marginTop: 2, color: SOFT, fontSize: 9 }}>{p.stats.cellsRevealed} cases · {p.stats.visits} tours</div></div><div style={{ color: themeAccent, fontSize: 18, fontWeight: 1000 }}>{bestCardProgress(p)}/{p.cards[0]?.cells?.length || config.cellsPerCard}</div></div>)}</div></div></div> : null}

      <ScoreResultOverlay result={scoreReveal} lang={lang === "fr" ? "fr" : "en"} />

      {winner ? <LoterieEndPanel finalPlayers={players} winnerId={winnerId} events={events} config={{ ...config, participantMode }} accent={themeAccent} onReplay={resetGame} onStats={(focusId: string) => (go || setTab)?.("statsHub", { tab: "stats", initialPlayerId: focusId, playerId: focusId, initialStatsSubTab: "loterie" })} onMenu={() => (go || setTab)?.("games")} /> : null}
    </div>
  );
}
