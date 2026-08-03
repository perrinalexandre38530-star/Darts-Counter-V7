// @ts-nocheck
// =============================================================
// DARTS POKER — configuration guidée / complète
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

const LS_KEY = "dc_modecfg_darts_poker_v1";
const RED = "#e83a43";
const GOLD = "#f6c256";
const GREEN = "#5ce6a8";

function readSaved() {
  try { const value = JSON.parse(localStorage.getItem(LS_KEY) || "null"); return value && typeof value === "object" ? value : {}; }
  catch { return {}; }
}
function unique(ids: any[]) { return Array.from(new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))); }
function isBotLike(profile: any) { return Boolean(profile?.isBot || profile?.bot || profile?.type === "bot" || profile?.kind === "bot" || profile?.botLevel); }
function shuffle<T>(items: T[]): T[] { const out = [...items]; for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }

function Rules() {
  return <div style={{ display: "grid", gap: 11, fontSize: 13, lineHeight: 1.48 }}>
    <div><strong style={{ color: GOLD }}>MARCHÉ</strong><br />Les secteurs 1 à 20 portent chacun une carte visible. Une carte gagnée est immédiatement remplacée.</div>
    <div><strong style={{ color: RED }}>MAIN</strong><br />Chaque joueur dispose de 5, 6 ou 7 fléchettes pour construire la meilleure combinaison de 5 cartes.</div>
    <div><strong style={{ color: GREEN }}>POUVOIRS</strong><br />Simple = carte. Double = carte + Échange. Triple = carte + Choix de 2 cartes.</div>
    <div><strong style={{ color: GOLD }}>BULLS</strong><br />Bull = Choix de 2 cartes. Double Bull = Joker, limité à un Joker par main.</div>
    <div><strong style={{ color: "#fff" }}>CLASSEMENT</strong><br />Carte haute, paire, double paire, brelan, suite, couleur, full, carré, quinte flush et quinte flush royale.</div>
    <div><strong style={{ color: RED }}>VICTOIRE</strong><br />Une main gagnée rapporte un point. Après toutes les manches, le plus grand nombre de victoires l’emporte.</div>
  </div>;
}

export default function DartsPokerConfig(props: any) {
  const { theme } = useTheme();
  const store = props?.store ?? props?.params?.store;
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const saved = React.useMemo(readSaved, []);
  const primary = theme?.primary || GOLD;
  const soft = theme?.textSoft || "#aeb2c8";

  const allProfiles = React.useMemo(() => Array.isArray(store?.profiles) ? store.profiles : [], [store?.profiles]);
  const humanProfiles = React.useMemo(() => allProfiles.filter((p: any) => !isBotLike(p)), [allProfiles]);
  const customBots = React.useMemo(() => { try { return loadBotPlayers().map((b: any) => ({ ...b, id: String(b.id), isBot: true })); } catch { return []; } }, []);
  const profilePool = React.useMemo(() => [...humanProfiles, ...customBots], [humanProfiles, customBots]);
  const byId = React.useMemo(() => new Map(profilePool.map((p: any) => [String(p.id), p])), [profilePool]);

  const [viewMode, setViewMode] = React.useState<"guided" | "complete">(() => localStorage.getItem("dc_poker_config_view") === "complete" ? "complete" : "guided");
  const [step, setStep] = React.useState(0);
  const steps = ["Joueurs", "Format", "Pouvoirs", "Saisie", "Résumé"];
  const [selectedIds, setSelectedIds] = React.useState<string[]>(unique(saved.selectedIds || []).slice(0, 8));
  const [botsPanel, setBotsPanel] = React.useState(Boolean(saved.botsPanel));
  const [botLevel, setBotLevel] = React.useState<DartsPokerBotLevel>(saved.botLevel === "easy" || saved.botLevel === "hard" ? saved.botLevel : "normal");
  const [rounds, setRounds] = React.useState<3 | 5 | 7 | 10>(([3,5,7,10].includes(Number(saved.rounds)) ? Number(saved.rounds) : 5) as any);
  const [dartsPerHand, setDartsPerHand] = React.useState<5 | 6 | 7>(([5,6,7].includes(Number(saved.dartsPerHand)) ? Number(saved.dartsPerHand) : 6) as any);
  const [powersEnabled, setPowersEnabled] = React.useState(saved.powersEnabled !== false);
  const [jokerEnabled, setJokerEnabled] = React.useState(saved.jokerEnabled !== false);
  const autoDrawMissing = true;
  const [openHands, setOpenHands] = React.useState(saved.openHands !== false);
  const [randomOrder, setRandomOrder] = React.useState(Boolean(saved.randomOrder));
  const [scoreInputMethod, setScoreInputMethod] = React.useState<"keypad" | "dartboard">(saved.scoreInputMethod === "dartboard" ? "dartboard" : "keypad");
  const [playerDartSets, setPlayerDartSets] = React.useState<Record<string, string | null>>(saved.playerDartSets || {});

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
    const playersList = ids.map((id) => byId.get(id)).filter(Boolean).map((profile: any) => ({
      ...profile, id: String(profile.id), name: profile?.name || profile?.displayName || "Joueur",
      dartSetId: playerDartSets[String(profile.id)] ?? null, isBot: isBotLike(profile),
    }));
    const botIds = playersList.filter(isBotLike).map((profile: any) => String(profile.id));
    const payload: DartsPokerConfigPayload = {
      mode: "darts_poker", players: ids.length, selectedIds: ids, playersList, playerDartSets,
      botIds, botsEnabled: botIds.length > 0, botLevel, rounds, dartsPerHand, powersEnabled,
      jokerEnabled, autoDrawMissing, openHands, randomOrder, scoreInputMethod,
    };
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ...payload, botsPanel })); } catch {}
    try { recordProfileUsageForMode("darts_poker", ids); } catch {}
    if (typeof go === "function") go("darts_poker_play", payload);
  }

  const card: React.CSSProperties = { width: "100%", boxSizing: "border-box", borderRadius: 18, padding: 12, background: "linear-gradient(180deg,rgba(255,255,255,.065),rgba(0,0,0,.28))", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 14px 34px rgba(0,0,0,.28)" };
  const block: React.CSSProperties = { ...card, marginBottom: 10, background: "rgba(8,9,13,.96)", border: `1px solid ${GOLD}35` };

  const playersBlock = <section style={block}>
    <div style={{ color: GOLD, fontSize: 12, fontWeight: 1000, letterSpacing: 1, marginBottom: 10 }}>TABLE DE JEU</div>
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
    <div style={{ color: RED, fontSize: 12, fontWeight: 1000, letterSpacing: 1, marginBottom: 7 }}>FORMAT DE PARTIE</div>
    <OptionRow label="Manches"><OptionSelect value={rounds} options={[3,5,7,10]} onChange={(v: any) => setRounds(Number(v) as any)} /></OptionRow>
    <OptionRow label="Fléchettes par main"><OptionSelect value={dartsPerHand} options={[{ value: 5, label: "5 · Tendu" }, { value: 6, label: "6 · Standard" }, { value: 7, label: "7 · Généreux" }]} onChange={(v: any) => setDartsPerHand(Number(v) as any)} /></OptionRow>
    <OptionRow label="Ordre aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow>
    <OptionRow label="Mains adverses visibles"><OptionToggle value={openHands} onChange={setOpenHands} /></OptionRow>
  </section>;

  const powersBlock = <section style={block}>
    <div style={{ color: GOLD, fontSize: 12, fontWeight: 1000, letterSpacing: 1, marginBottom: 7 }}>POUVOIRS POKER</div>
    <OptionRow label="Doubles / Triples spéciaux"><OptionToggle value={powersEnabled} onChange={setPowersEnabled} /></OptionRow>
    <OptionRow label="Double Bull = Joker"><OptionToggle value={jokerEnabled} onChange={setJokerEnabled} /></OptionRow>
    <div style={{ color: soft, fontSize: 10.5, lineHeight: 1.5, marginTop: 8 }}>Les pouvoirs non utilisés sont perdus à la validation de la main. Le moteur conserve automatiquement la meilleure combinaison de 5 cartes.</div>
  </section>;

  const inputBlock = <section style={block}>
    <div style={{ color: GREEN, fontSize: 12, fontWeight: 1000, letterSpacing: 1, marginBottom: 7 }}>SAISIE & CONFORT</div>
    <OptionRow label="Mode de saisie"><OptionSelect value={scoreInputMethod} options={[{ value: "keypad", label: "Clavier" }, { value: "dartboard", label: "Cible interactive" }]} onChange={setScoreInputMethod} /></OptionRow>
    <div style={{ color: soft, fontSize: 10.5, lineHeight: 1.5, marginTop: 8 }}>Chaque volée et chaque impact S/D/T/Bull/DBull/Miss sont enregistrés pour l’historique et les statistiques.</div>
  </section>;

  const summaryBlock = <section style={{ ...block, borderColor: `${GOLD}70`, background: `linear-gradient(135deg,${RED}16,${GOLD}0e)` }}>
    <div style={{ textAlign: "center", color: "#fff", fontSize: 15, fontWeight: 1100 }}>TABLE PRÊTE</div>
    <div style={{ textAlign: "center", color: GOLD, fontSize: 11, fontWeight: 1000, marginTop: 4 }}>{rounds} manches · {dartsPerHand} fléchettes · {powersEnabled ? "Pouvoirs actifs" : "Poker pur"}</div>
    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
      {[["JOUEURS", selectedIds.length], ["MARCHÉ", "20 CARTES"], ["JOKER", jokerEnabled ? "OUI" : "NON"]].map(([label, value]) => <div key={String(label)} style={{ padding: 9, borderRadius: 12, textAlign: "center", background: "rgba(0,0,0,.30)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ color: soft, fontSize: 8, fontWeight: 950 }}>{label}</div><div style={{ color: label === "MARCHÉ" ? GOLD : "#fff", fontWeight: 1100, fontSize: 13 }}>{value}</div></div>)}
    </div>
  </section>;

  const contentByStep = [playersBlock, formatBlock, powersBlock, inputBlock, summaryBlock];

  return <div style={{ minHeight: "100dvh", color: theme?.text || "#fff", background: `radial-gradient(circle at 50% -10%,${RED}28 0,${theme?.bg || "#070912"} 43%,#020203 100%)`, paddingBottom: 18 }}>
    <PageHeader tickerSrc={tickerDartsPoker} tickerAlt="DARTS POKER" left={<div style={{ marginLeft: 6 }}><BackDot onClick={back} color={GOLD} glow={`${GOLD}88`} /></div>} right={<div style={{ marginRight: 6 }}><InfoDot title="Règles DARTS POKER" color={RED} glow={`${RED}88`} content={<Rules />} /></div>} />
    <main style={{ width: "min(920px,100%)", margin: "0 auto", padding: "8px 9px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 10 }}><PillButton label="Guidé" active={viewMode === "guided"} onClick={() => chooseView("guided")} primary={GOLD} primarySoft={`${GOLD}18`} /><PillButton label="Complet" active={viewMode === "complete"} onClick={() => chooseView("complete")} primary={RED} primarySoft={`${RED}18`} /></div>
      {viewMode === "guided" ? <>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${steps.length},minmax(0,1fr))`, gap: 4, marginBottom: 9 }}>{steps.map((label, index) => <button key={label} onClick={() => setStep(index)} style={{ minHeight: 39, borderRadius: 10, border: `1px solid ${step === index ? (index === 2 ? RED : GOLD) : "rgba(255,255,255,.08)"}`, background: step === index ? `${index === 2 ? RED : GOLD}18` : "rgba(255,255,255,.025)", color: step === index ? "#fff" : soft, fontSize: 8, fontWeight: 1000 }}>{index + 1}<br />{label.toUpperCase()}</button>)}</div>
        {contentByStep[step]}
        <div style={{ display: "grid", gridTemplateColumns: step === 0 ? "1fr" : "1fr 1fr", gap: 8 }}>
          {step > 0 ? <button onClick={() => setStep((v) => Math.max(0, v - 1))} style={{ minHeight: 46, borderRadius: 14, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.05)", color: "#fff", fontWeight: 1000 }}>PRÉCÉDENT</button> : null}
          {step < steps.length - 1 ? <button onClick={() => setStep((v) => Math.min(steps.length - 1, v + 1))} style={{ minHeight: 46, borderRadius: 14, border: `1px solid ${GOLD}88`, background: `linear-gradient(135deg,${GOLD}24,${RED}18)`, color: "#fff", fontWeight: 1000 }}>SUIVANT</button> : <button disabled={!valid} onClick={start} style={{ minHeight: 48, borderRadius: 14, border: `1px solid ${valid ? GOLD : "#555"}`, background: valid ? `linear-gradient(135deg,${RED},#8e121d)` : "#282a30", color: "#fff", fontWeight: 1100, boxShadow: valid ? `0 0 24px ${RED}55` : "none" }}>♠ LANCER LA PARTIE</button>}
        </div>
      </> : <>{playersBlock}{formatBlock}{powersBlock}{inputBlock}{summaryBlock}<button disabled={!valid} onClick={start} style={{ width: "100%", minHeight: 52, borderRadius: 16, border: `1px solid ${valid ? GOLD : "#555"}`, background: valid ? `linear-gradient(135deg,${RED},#8e121d)` : "#282a30", color: "#fff", fontWeight: 1100, boxShadow: valid ? `0 0 24px ${RED}55` : "none" }}>♠ DÉMARRER DARTS POKER</button></>}
    </main>
  </div>;
}
