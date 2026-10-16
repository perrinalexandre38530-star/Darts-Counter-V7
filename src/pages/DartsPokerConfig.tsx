// @ts-nocheck
// =============================================================
// DARTS POKER — CONFIG FINAL
// Configuration guidée / complète, lisible avant le premier lancer.
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import BotPagedSelector from "../components/BotPagedSelector";
import InfoDot from "../components/InfoDot";
import OptionRow from "../components/OptionRow";
import OptionSelect from "../components/OptionSelect";
import OptionToggle from "../components/OptionToggle";
import PageHeader from "../components/PageHeader";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import { useTheme } from "../contexts/ThemeContext";
import { loadBotPlayers } from "../lib/bots";
import type { DartsPokerConfigPayload, DartsPokerBotLevel } from "../lib/gameEngines/dartsPokerEngine";
import { recordProfileUsageForMode } from "../lib/profileUsage";
import { PillButton, SelectedParticipantsCompactBlock, x01MostUsedDartSetIdForProfile } from "./X01ConfigV3";
import tickerDartsPoker from "../assets/tickers/ticker_darts_poker.png";
import { DartsPokerDeckGallery, DartsPokerDeckPreview } from "../components/darts-poker/DartsPokerCard";
import DartsPokerBadgeGallery from "../components/darts-poker/DartsPokerBadgeGallery";

const LS_KEY = "dc_modecfg_darts_poker_v1";
const RED = "#e83a43";
const GOLD = "#f6c256";
const GREEN = "#5ce6a8";
const BLUE = "#55c7ff";
const SOFT = "#aeb2c8";

function readSaved() {
  try { const value = JSON.parse(localStorage.getItem(LS_KEY) || "null"); return value && typeof value === "object" ? value : {}; }
  catch { return {}; }
}
function unique(ids: any[]) { return Array.from(new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))); }
function isBotLike(profile: any) { return Boolean(profile?.isBot || profile?.bot || profile?.type === "bot" || profile?.kind === "bot" || profile?.botLevel); }
function shuffle<T>(items: T[]): T[] { const out = [...items]; for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }

function Rules() {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.5 }}>
    <div><strong style={{ color: GOLD }}>MARCHÉ</strong><br />Les secteurs 1 à 20 portent chacun une carte visible. Une carte gagnée est remplacée immédiatement.</div>
    <div><strong style={{ color: RED }}>RYTHME</strong><br />Chaque joueur dispose de 6 fléchettes, mais on alterne après CHAQUE fléchette.</div>
    <div><strong style={{ color: GREEN }}>POUVOIRS</strong><br />Simple = carte. Double = carte + Échange. Triple = carte + Choix. Bull25 = tirer 2 cartes et en garder 1. DBull = Joker.</div>
    <div><strong style={{ color: BLUE }}>MAIN</strong><br />Après les 6 fléchettes, le jeu retient automatiquement les 5 meilleures cartes.</div>
    <div><strong style={{ color: GOLD }}>CONTRAT</strong><br />Un objectif bonus peut rapporter 1 point supplémentaire sans remplacer la victoire de manche.</div>
    <div><strong style={{ color: "#fff" }}>VICTOIRE</strong><br />La meilleure main gagne la manche. Classement final : points, puis victoires et qualité des mains.</div>
  </div>;
}

function IntroStrip() {
  const items = [
    ["1", "VISE", "un secteur 1–20", GOLD],
    ["2", "GAGNE", "la carte du secteur", GREEN],
    ["3", "ALTERNE", "1 fléchette chacun", BLUE],
    ["4", "AMÉLIORE", "ta main + pouvoirs", RED],
    ["5", "SHOWDOWN", "meilleure main", GOLD],
  ];
  return <section className="dp-how" style={{ marginBottom: 10 }}>
    <div style={{ color: GOLD, fontSize: 9, fontWeight: 1100, letterSpacing: .8, marginBottom: 6, textAlign: "center" }}>DARTS POKER EN 20 SECONDES</div>
    <div className="dp-how-grid">{items.map(([n, title, text, color]: any) => <div key={n} style={{ borderRadius: 12, border: `1px solid ${color}44`, background: `${color}0a`, padding: "7px 5px", textAlign: "center" }}><div style={{ width: 20, height: 20, margin: "0 auto 4px", borderRadius: 999, display: "grid", placeItems: "center", background: color, color: "#07080a", fontSize: 8, fontWeight: 1200 }}>{n}</div><div style={{ color, fontSize: 7.8, fontWeight: 1150 }}>{title}</div><div style={{ color: SOFT, fontSize: 6.5, marginTop: 2 }}>{text}</div></div>)}</div>
    <div style={{ color: "#fff", fontSize: 8.5, fontWeight: 950, textAlign: "center", marginTop: 7 }}><span style={{ color: RED }}>RÈGLE CLÉ :</span> 6 fléchettes par joueur, mais <span style={{ color: GOLD }}>une seule fléchette avant de passer au suivant.</span></div>
  </section>;
}

export default function DartsPokerConfig(props: any) {
  const { theme } = useTheme();
  const store = props?.store ?? props?.params?.store;
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const saved = React.useMemo(readSaved, []);
  const soft = theme?.textSoft || SOFT;

  const allProfiles = React.useMemo(() => Array.isArray(store?.profiles) ? store.profiles : [], [store?.profiles]);
  const humanProfiles = React.useMemo(() => allProfiles.filter((p: any) => !isBotLike(p)), [allProfiles]);
  const customBots = React.useMemo(() => { try { return loadBotPlayers().map((b: any) => ({ ...b, id: String(b.id), isBot: true })); } catch { return []; } }, []);
  const profilePool = React.useMemo(() => [...humanProfiles, ...customBots], [humanProfiles, customBots]);
  const byId = React.useMemo(() => new Map(profilePool.map((p: any) => [String(p.id), p])), [profilePool]);

  const [viewMode, setViewMode] = React.useState<"guided" | "complete">(() => localStorage.getItem("dc_poker_config_view") === "complete" ? "complete" : "guided");
  const [step, setStep] = React.useState(0);
  const steps = ["Table", "Partie", "Règles", "Saisie", "Lancer"];
  const [selectedIds, setSelectedIds] = React.useState<string[]>(unique(saved.selectedIds || []).slice(0, 8));
  const [botsPanel, setBotsPanel] = React.useState(Boolean(saved.botsPanel));
  const [botLevel, setBotLevel] = React.useState<DartsPokerBotLevel>(saved.botLevel === "easy" || saved.botLevel === "hard" ? saved.botLevel : "normal");
  const [rounds, setRounds] = React.useState<3 | 5 | 7 | 10>(([3, 5, 7, 10].includes(Number(saved.rounds)) ? Number(saved.rounds) : 5) as any);
  const dartsPerHand: 6 = 6;
  const [powersEnabled, setPowersEnabled] = React.useState(saved.powersEnabled !== false);
  const [jokerEnabled, setJokerEnabled] = React.useState(saved.jokerEnabled !== false);
  const [contractsEnabled, setContractsEnabled] = React.useState(saved.contractsEnabled !== false);
  const [assistanceEnabled, setAssistanceEnabled] = React.useState(saved.assistanceEnabled !== false);
  const autoDrawMissing = true;
  const [openHands, setOpenHands] = React.useState(saved.openHands !== false);
  const [randomOrder, setRandomOrder] = React.useState(Boolean(saved.randomOrder));
  const [scoreInputMethod, setScoreInputMethod] = React.useState<"keypad" | "dartboard">(saved.scoreInputMethod === "dartboard" ? "dartboard" : "keypad");
  const [playerDartSets, setPlayerDartSets] = React.useState<Record<string, string | null>>(saved.playerDartSets || {});
  const [showDeckGallery, setShowDeckGallery] = React.useState(false);
  const [showBadgeGallery, setShowBadgeGallery] = React.useState(false);

  function togglePlayer(idRaw: string) {
    const id = String(idRaw || "");
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 8 ? prev : [...prev, id]);
    setPlayerDartSets((prev) => Object.prototype.hasOwnProperty.call(prev, id) ? prev : ({ ...prev, [id]: x01MostUsedDartSetIdForProfile(id) || null }));
  }
  function handleDartSet(id: string, dartSetId: string | null) { setPlayerDartSets((prev) => ({ ...prev, [String(id)]: dartSetId || null })); }

  const selectedItems = selectedIds.map((id) => byId.get(id)).filter(Boolean);
  const selectedBots = selectedItems.filter(isBotLike);
  const valid = selectedIds.length >= 1 && selectedIds.length <= 8;

  function chooseView(next: "guided" | "complete") { setViewMode(next); try { localStorage.setItem("dc_poker_config_view", next); } catch {} }
  function back() { if (typeof go === "function") go("games"); }
  function start() {
    if (!valid) return;
    const ids = randomOrder ? shuffle(selectedIds) : [...selectedIds];
    const playersList = ids.map((id) => byId.get(id)).filter(Boolean).map((profile: any) => ({ ...profile, id: String(profile.id), name: profile?.name || profile?.displayName || "Joueur", dartSetId: playerDartSets[String(profile.id)] ?? null, isBot: isBotLike(profile) }));
    const botIds = playersList.filter(isBotLike).map((profile: any) => String(profile.id));
    const payload: DartsPokerConfigPayload = {
      mode: "darts_poker", players: ids.length, selectedIds: ids, playersList, playerDartSets,
      botIds, botsEnabled: botIds.length > 0, botLevel, rounds, dartsPerHand, powersEnabled,
      jokerEnabled, contractsEnabled, assistanceEnabled, autoDrawMissing, openHands, randomOrder, scoreInputMethod,
    };
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ...payload, botsPanel })); } catch {}
    try { recordProfileUsageForMode("darts_poker", ids); } catch {}
    if (typeof go === "function") go("darts_poker_play", payload);
  }

  const card: React.CSSProperties = { width: "100%", boxSizing: "border-box", borderRadius: 18, padding: 12, background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(0,0,0,.30))", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 14px 34px rgba(0,0,0,.28)" };
  const block: React.CSSProperties = { ...card, marginBottom: 10, background: "rgba(8,9,13,.96)", border: `1px solid ${GOLD}35` };
  const choiceCard = (active: boolean, color: string): React.CSSProperties => ({ minHeight: 64, borderRadius: 13, border: `1px solid ${active ? color : "rgba(255,255,255,.10)"}`, background: active ? `${color}16` : "rgba(255,255,255,.025)", color: "#fff", padding: 8, cursor: "pointer", boxShadow: active ? `0 0 18px ${color}22` : "none" });

  const playersBlock = <section style={block}>
    <div style={{ color: GOLD, fontSize: 12, fontWeight: 1100, letterSpacing: 1, marginBottom: 6 }}>1 · TABLE</div>
    <div style={{ color: soft, fontSize: 9, marginBottom: 10 }}>Choisis 1 à 8 joueurs. Les bots peuvent être ajoutés à la même table.</div>
    <SelectedParticipantsCompactBlock items={selectedItems} accent={GOLD} onRemove={togglePlayer} playerDartSets={playerDartSets} onDartSetChange={handleDartSet} allProfiles={humanProfiles} />
    <PlayerPagedSelector usageMode="darts_poker" profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={GOLD} pageSize={9} modalTitle="Choisir les joueurs" showSelectedSummary={false} />
    <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <strong style={{ color: selectedIds.length ? GREEN : "#ff9aa8", fontSize: 11 }}>{selectedIds.length ? `${selectedIds.length} joueur${selectedIds.length > 1 ? "s" : ""} à la table` : "Sélectionne au moins un joueur"}</strong>
      <button type="button" onClick={() => setBotsPanel((v) => !v)} style={{ borderRadius: 999, padding: "7px 11px", border: `1px solid ${RED}77`, background: botsPanel ? `${RED}18` : "rgba(255,255,255,.04)", color: "#fff", fontWeight: 950 }}>BOTS {botsPanel ? "ON" : "OFF"}</button>
    </div>
    {botsPanel ? <div style={{ marginTop: 10 }}><BotPagedSelector bots={customBots} selectedIds={selectedIds} onToggle={togglePlayer} accent={RED} label="BOTS POKER" showCheckbox={false} showSelectedSummary={false} /></div> : null}
    {selectedBots.length ? <div style={{ marginTop: 8 }}><OptionRow label="Niveau des Bots"><OptionSelect value={botLevel} options={[{ value: "easy", label: "Débutant" }, { value: "normal", label: "Joueur" }, { value: "hard", label: "Shark" }]} onChange={setBotLevel} /></OptionRow></div> : null}
  </section>;

  const formatBlock = <section style={block}>
    <div style={{ color: RED, fontSize: 12, fontWeight: 1100, letterSpacing: 1, marginBottom: 6 }}>2 · PARTIE</div>
    <div style={{ color: soft, fontSize: 9, marginBottom: 8 }}>Chaque manche donne exactement 6 fléchettes à chaque joueur, en alternance stricte.</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6, marginBottom: 9 }}>{([3, 5, 7, 10] as const).map((value) => <button key={value} type="button" onClick={() => setRounds(value)} style={choiceCard(rounds === value, RED)}><div style={{ color: rounds === value ? RED : soft, fontSize: 7, fontWeight: 1050 }}>MANCHES</div><div style={{ fontSize: 18, fontWeight: 1200, marginTop: 2 }}>{value}</div></button>)}</div>
    <div style={{ padding: 9, borderRadius: 12, border: `1px solid ${GOLD}55`, background: `${GOLD}0b`, textAlign: "center", marginBottom: 7 }}><div style={{ color: GOLD, fontSize: 10, fontWeight: 1200 }}>6 FLÉCHETTES / JOUEUR</div><div style={{ color: "#fff", fontSize: 8, marginTop: 3 }}>1 fléchette → joueur suivant → 1 fléchette → joueur suivant…</div></div>
    <OptionRow label="Ordre aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow>
    <OptionRow label="Mains adverses visibles"><OptionToggle value={openHands} onChange={setOpenHands} /></OptionRow>
  </section>;

  const powersBlock = <section style={block}>
    <div style={{ color: GOLD, fontSize: 12, fontWeight: 1100, letterSpacing: 1, marginBottom: 6 }}>3 · RÈGLES & POUVOIRS</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 5, marginBottom: 10 }}>
      {[["S","CARTE",GOLD],["D","+ ÉCHANGE",BLUE],["T","+ CHOIX",RED],["25","CHOIX 2→1",GREEN],["50","JOKER",GOLD]].map(([key,label,color]: any) => <div key={key} style={{ padding: "7px 3px", borderRadius: 10, textAlign: "center", border: `1px solid ${color}44`, background: `${color}0c` }}><div style={{ color, fontWeight: 1200, fontSize: 10 }}>{key}</div><div style={{ color: soft, fontSize: 6.5, marginTop: 2 }}>{label}</div></div>)}
    </div>
    <div style={{ color: "#fff", fontSize: 8, textAlign: "center", marginBottom: 9 }}><strong style={{ color: GOLD }}>Même secteur = même carte.</strong> D et T ajoutent seulement leur pouvoir.</div>
    <OptionRow label="Pouvoirs Double / Triple"><OptionToggle value={powersEnabled} onChange={setPowersEnabled} /></OptionRow>
    <OptionRow label="Double Bull = Joker"><OptionToggle value={jokerEnabled} onChange={setJokerEnabled} /></OptionRow>
    <OptionRow label="Contrat bonus par manche"><OptionToggle value={contractsEnabled} onChange={setContractsEnabled} /></OptionRow>
    <div style={{ marginTop: 9, color: soft, fontSize: 8.5, lineHeight: 1.45 }}>Les pouvoirs sont utilisés après les 6 fléchettes. Le moteur conserve automatiquement les 5 meilleures cartes pour le showdown.</div>
    <div style={{ marginTop: 9, display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>{["Carte haute","Paire","2 Paires","Brelan","Suite","Couleur","Full","Carré","Quinte Flush","Royale"].map((label, index) => <span key={label} style={{ borderRadius: 999, padding: "3px 6px", border: "1px solid rgba(255,255,255,.09)", background: index >= 5 ? `${GOLD}0a` : "rgba(255,255,255,.025)", color: index >= 5 ? GOLD : soft, fontSize: 6.6, fontWeight: 900 }}>{label}</span>)}</div>
  </section>;

  const inputBlock = <section style={block}>
    <div style={{ color: GREEN, fontSize: 12, fontWeight: 1100, letterSpacing: 1, marginBottom: 6 }}>4 · SAISIE & ASSISTANCE</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginBottom: 9 }}>
      <button type="button" onClick={() => setScoreInputMethod("keypad")} style={choiceCard(scoreInputMethod === "keypad", BLUE)}><div style={{ color: BLUE, fontWeight: 1150 }}>CLAVIER</div><div style={{ color: soft, fontSize: 7, marginTop: 3 }}>Keypad commun de l’application</div></button>
      <button type="button" onClick={() => setScoreInputMethod("dartboard")} style={choiceCard(scoreInputMethod === "dartboard", GREEN)}><div style={{ color: GREEN, fontWeight: 1150 }}>CIBLE INTERACTIVE</div><div style={{ color: soft, fontSize: 7, marginTop: 3 }}>Toucher directement le secteur</div></button>
    </div>
    <OptionRow label="Conseils stratégiques"><OptionToggle value={assistanceEnabled} onChange={setAssistanceEnabled} /></OptionRow>
    <div style={{ color: soft, fontSize: 8.5, lineHeight: 1.45, marginTop: 8 }}>L’assistance n’altère jamais le score : elle explique seulement quelles cartes visibles renforcent la main ou le contrat.</div>
    {assistanceEnabled ? <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}>{[["★","PRIORITÉ",GOLD],["↑","BONNE",GREEN],["+","UTILE",BLUE],["·","FAIBLE","#7d8493"]].map(([icon,label,color]: any) => <div key={label} style={{ borderRadius: 10, padding: "7px 2px", textAlign: "center", border: `1px solid ${color}44`, background: `${color}0a` }}><div style={{ color, fontSize: 11, fontWeight: 1200 }}>{icon}</div><div style={{ color, fontSize: 6.5, fontWeight: 1050 }}>{label}</div></div>)}</div> : null}
  </section>;

  const summaryBlock = <section style={{ ...block, borderColor: `${GOLD}70`, background: `linear-gradient(135deg,${RED}15,${GOLD}0d)` }}>
    <div style={{ color: GOLD, fontSize: 12, fontWeight: 1100, letterSpacing: 1, textAlign: "center" }}>5 · TABLE PRÊTE</div>
    <div style={{ marginTop: 7, textAlign: "center", color: "#fff", fontSize: 11, fontWeight: 1050 }}>{selectedIds.length || 0} joueur{selectedIds.length > 1 ? "s" : ""} · {rounds} manches · 6 fléchettes chacun</div>
    <div style={{ marginTop: 9, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}>{[["POUVOIRS",powersEnabled ? "ON" : "OFF",BLUE],["JOKER",jokerEnabled ? "ON" : "OFF",GOLD],["CONTRAT",contractsEnabled ? "ON" : "OFF",RED],["CONSEILS",assistanceEnabled ? "ON" : "OFF",GREEN]].map(([label,value,color]: any) => <div key={label} style={{ borderRadius: 11, padding: 8, textAlign: "center", border: `1px solid ${color}44`, background: `${color}0a` }}><div style={{ color: soft, fontSize: 6.3 }}>{label}</div><div style={{ color, fontSize: 9, fontWeight: 1150, marginTop: 2 }}>{value}</div></div>)}</div>
    <div style={{ marginTop: 9, padding: 9, borderRadius: 12, border: "1px solid rgba(255,255,255,.09)", background: "rgba(0,0,0,.26)" }}><div style={{ color: "#fff", fontSize: 8.5, fontWeight: 1050, textAlign: "center" }}>UNE MANCHE</div><div style={{ color: soft, fontSize: 7.5, marginTop: 4, textAlign: "center" }}>20 cartes visibles → 1 dart chacun → 6 darts/joueur → pouvoirs → meilleure main de 5 → showdown → points</div></div>
    <div style={{ marginTop: 9, padding: "7px 8px 5px", borderRadius: 14, border: "1px solid rgba(246,194,86,.26)", background: "radial-gradient(circle at 50% 0%,rgba(246,194,86,.08),rgba(255,255,255,.015) 70%)" }}>
      <div style={{ textAlign: "center", color: GOLD, fontSize: 7.5, fontWeight: 1100, letterSpacing: .8 }}>DECK MSS SIGNATURE</div>
      <DartsPokerDeckPreview />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6, marginTop: 4 }}>
        <button type="button" onClick={() => setShowDeckGallery(true)} style={{ minHeight: 34, borderRadius: 10, border: `1px solid ${GOLD}55`, background: `${GOLD}0d`, color: GOLD, fontSize: 8, fontWeight: 1050 }}>52 CARTES + JOKER</button>
        <button type="button" onClick={() => setShowBadgeGallery(true)} style={{ minHeight: 34, borderRadius: 10, border: `1px solid ${BLUE}55`, background: `${BLUE}0d`, color: BLUE, fontSize: 8, fontWeight: 1050 }}>12 BADGES · PROGRESSION</button>
      </div>
    </div>
  </section>;

  const contentByStep = [playersBlock, formatBlock, powersBlock, inputBlock, summaryBlock];
  const canGoNext = step !== 0 || valid;

  return <div style={{ minHeight: "100dvh", color: theme?.text || "#fff", background: `radial-gradient(circle at 50% -10%,${RED}26 0,${theme?.bg || "#070912"} 43%,#020203 100%)`, paddingBottom: 18 }}>
    <style>{`.dp-how-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}.dp-complete-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.dp-complete-grid>section{margin-bottom:0!important}@media(max-width:700px){.dp-how-grid{grid-template-columns:repeat(5,minmax(58px,1fr));overflow-x:auto}.dp-complete-grid{grid-template-columns:1fr}}`}</style>
    <PageHeader tickerSrc={tickerDartsPoker} tickerAlt="DARTS POKER" left={<div style={{ marginLeft: 6 }}><BackDot onClick={back} color={GOLD} glow={`${GOLD}88`} /></div>} right={<div style={{ marginRight: 6 }}><InfoDot title="Règles DARTS POKER" color={RED} glow={`${RED}88`} content={<Rules />} /></div>} />
    <main style={{ width: "min(940px,100%)", margin: "0 auto", padding: "8px 9px", boxSizing: "border-box" }}>
      <IntroStrip />
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 10 }}><PillButton label="Guidé" active={viewMode === "guided"} onClick={() => chooseView("guided")} primary={GOLD} primarySoft={`${GOLD}18`} /><PillButton label="Complet" active={viewMode === "complete"} onClick={() => chooseView("complete")} primary={RED} primarySoft={`${RED}18`} /></div>
      {viewMode === "guided" ? <>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${steps.length},minmax(0,1fr))`, gap: 4, marginBottom: 9 }}>{steps.map((label, index) => <button key={label} type="button" onClick={() => index === 0 || valid || step > 0 ? setStep(index) : null} style={{ minHeight: 42, borderRadius: 10, border: `1px solid ${step === index ? (index === 2 ? RED : GOLD) : "rgba(255,255,255,.08)"}`, background: step === index ? `${index === 2 ? RED : GOLD}18` : "rgba(255,255,255,.025)", color: step === index ? "#fff" : soft, fontSize: 7.2, fontWeight: 1000 }}>{index + 1}<br />{label.toUpperCase()}</button>)}</div>
        {contentByStep[step]}
        <div style={{ display: "grid", gridTemplateColumns: step === 0 ? "1fr" : "1fr 1fr", gap: 8 }}>
          {step > 0 ? <button type="button" onClick={() => setStep((v) => Math.max(0, v - 1))} style={{ minHeight: 46, borderRadius: 14, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.05)", color: "#fff", fontWeight: 1000 }}>PRÉCÉDENT</button> : null}
          {step < steps.length - 1 ? <button type="button" disabled={!canGoNext} onClick={() => canGoNext && setStep((v) => Math.min(steps.length - 1, v + 1))} style={{ minHeight: 46, borderRadius: 14, border: `1px solid ${canGoNext ? GOLD : "#555"}`, background: canGoNext ? `linear-gradient(135deg,${GOLD}24,${RED}18)` : "#282a30", color: "#fff", fontWeight: 1000, opacity: canGoNext ? 1 : .55 }}>{step === 0 && !valid ? "CHOISIS D’ABORD UN JOUEUR" : "SUIVANT"}</button> : <button type="button" disabled={!valid} onClick={start} style={{ minHeight: 50, borderRadius: 14, border: `1px solid ${valid ? GOLD : "#555"}`, background: valid ? `linear-gradient(135deg,${RED},#8e121d)` : "#282a30", color: "#fff", fontWeight: 1150, boxShadow: valid ? `0 0 24px ${RED}55` : "none" }}>♠ LANCER LA PARTIE</button>}
        </div>
      </> : <><div className="dp-complete-grid">{playersBlock}{formatBlock}{powersBlock}{inputBlock}</div>{summaryBlock}<button type="button" disabled={!valid} onClick={start} style={{ width: "100%", minHeight: 54, borderRadius: 16, border: `1px solid ${valid ? GOLD : "#555"}`, background: valid ? `linear-gradient(135deg,${RED},#8e121d)` : "#282a30", color: "#fff", fontWeight: 1150, boxShadow: valid ? `0 0 24px ${RED}55` : "none" }}>♠ DÉMARRER DARTS POKER</button></>}
    </main>

    {showDeckGallery ? <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.90)", backdropFilter: "blur(9px)", display: "grid", placeItems: "center", padding: 8 }}><div style={{ width: "min(920px,100%)", maxHeight: "94dvh", overflow: "auto", borderRadius: 20, padding: 12, background: "linear-gradient(180deg,#14151b,#050609)", border: `1px solid ${GOLD}66`, boxShadow: "0 24px 70px rgba(0,0,0,.65)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 9 }}><div><div style={{ color: GOLD, fontSize: 11, fontWeight: 1100 }}>DECK MSS SIGNATURE</div><div style={{ color: soft, fontSize: 8, marginTop: 2 }}>Toutes les cartes utilisées par Darts Poker</div></div><button type="button" onClick={() => setShowDeckGallery(false)} style={{ minHeight: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.05)", color: "#fff", padding: "0 12px", fontWeight: 1000 }}>FERMER</button></div><DartsPokerDeckGallery /></div></div> : null}
    {showBadgeGallery ? <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.92)", backdropFilter: "blur(10px)", display: "grid", placeItems: "center", padding: 8 }}><div style={{ width: "min(960px,100%)", maxHeight: "94dvh", overflow: "auto", borderRadius: 22, padding: 12, background: "radial-gradient(circle at 50% 0%,rgba(85,199,255,.10),#090a0f 48%)", border: `1px solid ${BLUE}66`, boxShadow: "0 24px 70px rgba(0,0,0,.68)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}><div><div style={{ color: BLUE, fontSize: 11, fontWeight: 1100 }}>TROPHÉES DARTS POKER</div><div style={{ color: soft, fontSize: 8, marginTop: 2 }}>12 badges permanents · progression par joueur</div></div><button type="button" onClick={() => setShowBadgeGallery(false)} style={{ minHeight: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.05)", color: "#fff", padding: "0 12px", fontWeight: 1000 }}>FERMER</button></div><DartsPokerBadgeGallery profiles={selectedItems.filter((profile: any) => !isBotLike(profile))} catalogOnly={!selectedItems.some((profile: any) => !isBotLike(profile))} /></div></div> : null}
  </div>;
}
