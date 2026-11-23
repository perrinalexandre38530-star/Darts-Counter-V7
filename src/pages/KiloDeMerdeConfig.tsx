// @ts-nocheck
// =============================================================
// PRÉSIDENT — configuration guidée / complète
// =============================================================

import React from "react";
import MSSCardDeckPicker from "../components/cards/MSSCardDeckPicker";
import BackDot from "../components/BackDot";
import BotPagedSelector from "../components/BotPagedSelector";
import InfoDot from "../components/InfoDot";
import OptionRow from "../components/OptionRow";
import OptionSelect from "../components/OptionSelect";
import OptionToggle from "../components/OptionToggle";
import PageHeader from "../components/PageHeader";
import tickerKiloFr from "../assets/tickers/ticker_kilo_de_merde_fr.webp";
import tickerKiloEn from "../assets/tickers/ticker_kilo_de_merde_en.webp";
import { useLang } from "../contexts/LangContext";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import { useTheme } from "../contexts/ThemeContext";
import { loadBotPlayers } from "../lib/bots";

import { recordProfileUsageForMode } from "../lib/profileUsage";
import {
  PillButton,
  SelectedParticipantsCompactBlock,
  X01_PRO_BOTS,
  x01MostUsedDartSetIdForProfile,
} from "./X01ConfigV3";



type BotLite = { id: string; name: string; avatarDataUrl?: string | null; avatarUrl?: string | null; avatar?: string | null; botLevel?: string; isBot?: boolean };
const LS_KEY = "dc_modecfg_kilo_de_merde_v1";
const GOLD = "#e9c56c";

function isBotLike(profile: any) {
  return Boolean(profile?.isBot || profile?.bot || profile?.type === "bot" || profile?.kind === "bot" || profile?.botLevel);
}
function loadUserBots(): BotLite[] {
  try {
    return loadBotPlayers().map((bot: any) => ({
      ...bot,
      id: String(bot.id), name: bot?.name || "BOT", avatarDataUrl: bot?.avatarDataUrl ?? bot?.avatarUrl ?? bot?.avatar ?? null,
      avatarUrl: bot?.avatarUrl ?? bot?.avatar ?? null, avatar: bot?.avatar ?? bot?.avatarUrl ?? bot?.avatarDataUrl ?? null,
      botLevel: bot?.botLevel ?? bot?.level ?? "", isBot: true,
    })).filter((bot: BotLite) => Boolean(bot.id));
  } catch { return []; }
}
function readSaved() { try { return JSON.parse(localStorage.getItem(LS_KEY) || "null") || {}; } catch { return {}; } }
function shuffle<T>(items: T[]) { const out = [...items]; for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }

function Rules({ color }: { color: string }) {
  return <div style={{display:"grid",gap:10,fontSize:12,lineHeight:1.5}}>
    <div><b style={{color}}>KILO DE MERDE — JEU DE CARTES</b><div>Gagne celui qui a le moins de kilos à la fin de la partie.</div></div>
    <div>Chaque joueur reçoit quatre cartes. Les 7 sont écartés de la distribution et restent dans le tas des kilos.</div>
    <div>Chacun choisit une carte et la passe simultanément à son voisin de gauche. Il faut rassembler quatre cartes de même valeur.</div>
    <div>Dès qu’un carré est constitué, défi BULL : chaque joueur lance trois fléchettes. Le plus faible score tire la carte de pénalité. En cas d’égalité, barrage entre les derniers.</div>
    <div>2 à 10 : valeur nominale ; Valet 11, Dame 12, Roi 13, As 100 kilos.</div>
    <div><b style={{color}}>CHASSE D'EAU :</b> un 7 tiré dans le tas annule tous les kilos de ce joueur et remet ses cartes de pénalité au tas.</div>
    <div style={{opacity:.7}}>Adaptation MSS aux fléchettes : BULL25 = 25 pts, DBULL50 = 50 pts, tout autre impact = MISS. Aucun joueur ne tape sur un tas.</div>
  </div>;
}

export default function KiloDeMerdeConfig(props: any) {
  const { lang } = useLang();
  const tickerKilo = lang === "fr" ? tickerKiloFr : tickerKiloEn;
  const { theme } = useTheme();
  const store = props?.store ?? props?.params?.store ?? null;
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const saved = React.useMemo(readSaved, []);
  const primary = theme?.primary || GOLD;
  const soft = theme?.primarySoft || `${primary}20`;
  const muted = theme?.textSoft || "#aeb2d3";

  const profiles: any[] = Array.isArray(store?.profiles) ? store.profiles : [];
  const humanProfiles = React.useMemo(() => profiles.filter((p) => !isBotLike(p)), [profiles]);
  const [botProfiles, setBotProfiles] = React.useState<BotLite[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>(Array.isArray(saved.selectedIds) ? saved.selectedIds.slice(0, 10).map(String) : []);
  const [playerDartSets, setPlayerDartSets] = React.useState<Record<string, string | null>>(saved.playerDartSets && typeof saved.playerDartSets === "object" ? saved.playerDartSets : {});
  const [botsPanelEnabled] = React.useState(false);
  const [botLevel, setBotLevel] = React.useState(saved.botLevel === "easy" || saved.botLevel === "hard" ? saved.botLevel : "normal");
  const [rounds, setRounds] = React.useState<1 | 3 | 5 | 7 | 10>(([1,3,5,7,10].includes(Number(saved.rounds)) ? Number(saved.rounds) : 5) as any);
  const [handSize, setHandSize] = React.useState<number>(Math.max(5, Math.min(16, Number(saved.handSize || 10))));
  const deckCopies = 1 as const;
  const variant = "kilo" as const;
  const [bullJoker, setBullJoker] = React.useState(saved.bullJoker !== false);
  const [coupEtat, setCoupEtat] = React.useState(saved.coupEtat !== false);
  const [revolution, setRevolution] = React.useState(saved.revolution !== false);
  const [randomOrder, setRandomOrder] = React.useState(saved.randomOrder !== false);
  const [scoreInputMethod, setScoreInputMethod] = React.useState<"keypad" | "dartboard">(saved.scoreInputMethod === "dartboard" ? "dartboard" : "keypad");
  const [view, setView] = React.useState<"guided" | "complete">(() => { try { return localStorage.getItem("dc_kilo_de_merde_config_view") === "complete" ? "complete" : "guided"; } catch { return "guided"; } });
  const [step, setStep] = React.useState(0);
  const steps = ["Participants", "Tours", "Chasse d’eau", "Gestion", "Résumé"];

  React.useEffect(() => {
    const map = new Map<string, BotLite>();
    (X01_PRO_BOTS || []).forEach((bot: any) => map.set(String(bot.id), { ...bot, id: String(bot.id), isBot: true }));
    loadUserBots().forEach((bot) => map.set(bot.id, bot));
    setBotProfiles([...map.values()]);
  }, []);
  React.useEffect(() => { if (!selectedIds.length && humanProfiles.length >= 3) setSelectedIds(humanProfiles.slice(0, 3).map((p) => String(p.id))); }, [humanProfiles, selectedIds.length]);
  React.useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ selectedIds, playerDartSets, botsPanelEnabled, botLevel, rounds, handSize, deckCopies, variant, bullJoker, coupEtat, revolution, randomOrder, scoreInputMethod })); } catch {}
  }, [selectedIds, playerDartSets, botsPanelEnabled, botLevel, rounds, handSize, deckCopies, variant, bullJoker, coupEtat, revolution, randomOrder, scoreInputMethod]);

  const allProfiles = React.useMemo(() => [...humanProfiles, ...botProfiles.map((p) => ({ ...p, isBot: true }))], [humanProfiles, botProfiles]);
  const byId = React.useMemo(() => new Map(allProfiles.map((p: any) => [String(p.id), p])), [allProfiles]);
  const selectedProfiles = selectedIds.map((id) => byId.get(id)).filter(Boolean) as any[];
  const selectedItems = selectedProfiles.map((profile: any) => ({ id: String(profile.id), kind: isBotLike(profile) ? "bot" : "player", name: profile?.name || profile?.displayName || "Joueur", profile }));

  const maxPlayers = 10;
  const valid = selectedIds.length >= 3 && selectedIds.length <= maxPlayers && selectedIds.every(id=>!isBotLike(byId.get(id)));
  const deckCapacity = 52;
  const actualHandSize = 4;
  const needCards = selectedIds.length * actualHandSize;
  const deckWarning = false;

  function togglePlayer(raw: string) {
    const id = String(raw || ""); if (!id) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxPlayers) return prev;
      if (!isBotLike(byId.get(id)) && !playerDartSets[id]) {
        const preferred = x01MostUsedDartSetIdForProfile(id, humanProfiles);
        if (preferred) setPlayerDartSets((sets) => ({ ...sets, [id]: preferred }));
      }
      return [...prev, id];
    });
  }
  function onStart() {
    if (!valid) return;
    const orderedIds = randomOrder ? shuffle(selectedIds) : [...selectedIds];
    const orderedProfiles = orderedIds.map((id) => byId.get(id)).filter(Boolean);
    const botIds = orderedProfiles.filter(isBotLike).map((p: any) => String(p.id));
    const payload = {
      mode: "kilo_de_merde", players: orderedIds.length, selectedIds: orderedIds,
      playersList: orderedProfiles.map((p: any) => ({ ...p, id: String(p.id), name: p?.name || p?.displayName || "Joueur", dartSetId: playerDartSets[String(p.id)] ?? null })),
      playerDartSets, botIds, botsEnabled: botIds.length > 0, botLevel, rounds, handSize: actualHandSize, deckCopies,
      variant, randomOrder, bullJoker:false, coupEtat:false, revolution:false, scoreInputMethod:"keypad" as const,
    };
    try { recordProfileUsageForMode("kilo_de_merde", orderedIds); } catch {}
    if (typeof go === "function") go("kilo_de_merde_play", {config:payload});
  }
  function back() { if (typeof props?.onBack === "function") return props.onBack(); if (typeof go === "function") go("games"); }

  const card: React.CSSProperties = { borderRadius: 18, padding: 14, background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(0,0,0,.26))", border: `1px solid ${primary}38`, boxShadow: "0 14px 32px rgba(0,0,0,.38)", marginBottom: 12, minWidth: 0, overflow: "hidden" };
  const rowHelp: React.CSSProperties = { marginTop: 8, color: muted, fontSize: 10.8, lineHeight: 1.45 };

  const participants = <section style={card}>
    <div style={{ color: primary, fontWeight: 1000, fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>PARTICIPANTS</div>
    <SelectedParticipantsCompactBlock items={selectedItems} accent={primary} onRemove={togglePlayer} playerDartSets={playerDartSets} onDartSetChange={(id: string, setId: string | null) => setPlayerDartSets((p) => ({ ...p, [id]: setId }))} allProfiles={humanProfiles} />
    <PlayerPagedSelector usageMode="kilo_de_merde" profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={primary} pageSize={9} modalTitle="Choisir les joueurs" showSelectedSummary={false} />
    <div style={rowHelp}>{"3 à 10 joueurs, chacun reçoit 4 cartes."}</div>


    <div style={{ marginTop: 10, padding: 9, borderRadius: 12, background: valid ? `${primary}0d` : "rgba(255,70,100,.08)", border: `1px solid ${valid ? primary + "45" : "rgba(255,110,130,.3)"}`, color: valid ? primary : "#ff9bb0", fontSize: 11, fontWeight: 900 }}>{valid ? `${selectedIds.length} joueurs sélectionnés — prêt.` : `Sélectionne entre 3 et ${maxPlayers} joueurs humains (pas de bots IA pour les échanges secrets).`}</div>
  </section>;

  const reign = <section style={card}><div style={{ color: primary, fontWeight: 1000, fontSize: 12, letterSpacing: 1, marginBottom: 7 }}>FORMAT DE LA PARTIE</div>
    <MSSCardDeckPicker />
    <OptionRow label="Tours / pénalités"><OptionSelect value={rounds} options={[1,3,5,7,10]} onChange={(v: any) => setRounds(Number(v) as any)} /></OptionRow>
    <div style={rowHelp}>4 cartes par joueur. Les cartes 7 restent dans le tas central et déclenchent la chasse d’eau.</div>
    <div style={{ ...rowHelp, color: primary, fontWeight: 900 }}>Paquet unique de 52 cartes, aucun Joker et aucun 7 dans les mains.</div>
    <OptionRow label="Ordre de départ aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow>
    <div style={rowHelp}>{"Chaque tour peut entraîner une pénalité. Les joueurs passent une carte à gauche jusqu’à ce qu’un joueur possède quatre cartes identiques."}</div>
    <div style={{ marginTop: 8, color: deckWarning ? "#ffd36e" : "#83e6bd", fontSize: 11, fontWeight: 850 }}>{variant === "classic" ? `${selectedIds.length||3} joueurs · 52 cartes distribuées intégralement (mains de ${Math.floor(52/(selectedIds.length||3))} à ${actualHandSize} cartes).` : `${selectedIds.length||3} joueurs × 4 cartes · les cartes non distribuées forment le tas central.`}{deckWarning ? ` Demande limitée à ${actualHandSize} pour éviter tout doublon.` : ""}</div>
  </section>;

  const chaos = <section style={card}><div style={{ color: primary, fontWeight: 1000, fontSize: 12, letterSpacing: 1, marginBottom: 7 }}>RÈGLE SPÉCIALE</div>
    <div style={rowHelp}><b>CHASSE D’EAU</b> : un 7 tiré du tas annule tous les kilos du joueur pénalisé.</div>

    <div style={rowHelp}>KILO DE MERDE : quatre cartes, échange vers la gauche, quatre identiques, défi BULL aux fléchettes : plus faible score pénalisé. Le 7 du tas déclenche la chasse d’eau intégrale.</div>
    <div style={rowHelp}>Chaque joueur vise le BULL avec trois fléchettes. Le plus faible score reçoit la pénalité ; égalité = barrage.</div>
  </section>;

  const input = <section style={card}><div style={{ color: primary, fontWeight: 1000, fontSize: 12, letterSpacing: 1, marginBottom: 7 }}>GESTION DES CARTES</div>
    <div style={rowHelp}>Les cartes sont choisies à l’écran. Dès qu’un carré apparaît, saisissez les trois impacts sur le keypad BULL : MISS / BULL25 / DBULL50.</div>

  </section>;

  const summary = <section style={card}><div style={{ color: primary, fontWeight: 1000, fontSize: 12, letterSpacing: 1, marginBottom: 9 }}>RÉSUMÉ</div>
    <div style={{ display: "grid", gap: 7, fontSize: 11.5 }}>
      {[["Participants", `${selectedIds.length} joueurs`],["Tours", `${rounds} pénalités`],["Main", `${actualHandSize} cartes/joueur${deckWarning ? ` (au lieu de ${handSize})` : ""}`],["Paquet", "52 cartes · 7 dans le tas"],["Mode", "KILO DE MERDE"],["Saisie", "Cartes + fléchettes BULL"]].map(([a,b]) => <div key={a as string} style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,.06)" }}><span style={{ color: muted }}>{a}</span><b>{b}</b></div>)}
    </div>
  </section>;

  const blockByStep = [participants, reign, chaos, input, summary];

  return <div style={{ minHeight: "100dvh", paddingBottom: 90, overflowX: "hidden" }}>
    <PageHeader difficultyGameId="kilo_de_merde" tickerSrc={tickerKilo} tickerAlt="KILO DE MERDE" tickerFit="contain" tickerHeight={90} tickerEdgeFade="strong" tickerBottomGap={8} left={<BackDot onClick={back} color={primary} glow={`${primary}77`} title="Retour" />} right={<InfoDot title="Règles de Kilo de merde" color={primary} glow={`${primary}77`} content={<Rules color={primary}/>} />} />
    <div style={{ padding: "8px 8px 0", maxWidth: 920, margin: "0 auto" }}>
      <section style={{ ...card, border: `1px solid ${primary}68` }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><div style={{ color: primary, fontWeight: 1000, letterSpacing: 1 }}>CONFIGURATION KILO DE MERDE</div><div style={{ color: muted, fontSize: 10.5, marginTop: 4 }}>Quatre cartes · échanges à gauche · défi BULL · chasse d’eau</div></div><div style={{ display: "flex", gap: 7 }}><PillButton label="Guidée" active={view === "guided"} onClick={() => { setView("guided"); try { localStorage.setItem("dc_kilo_de_merde_config_view", "guided"); } catch {} }} primary={primary} primarySoft={soft} /><PillButton label="Complète" active={view === "complete"} onClick={() => { setView("complete"); try { localStorage.setItem("dc_kilo_de_merde_config_view", "complete"); } catch {} }} primary={primary} primarySoft={soft} /></div></div></section>

      {view === "guided" ? <><section style={card}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div><b style={{ color: primary }}>Étape {step + 1}/{steps.length}</b><div style={{ color: muted, fontSize: 10.5 }}>{steps[step]}</div></div><div style={{ display: "flex", gap: 4 }}>{steps.map((s,i) => <button key={s} onClick={() => setStep(i)} style={{ width: 26, height: 26, borderRadius: 999, border: `1px solid ${i === step ? primary : "rgba(255,255,255,.1)"}`, background: i === step ? soft : "rgba(255,255,255,.03)", color: i === step ? primary : muted, fontWeight: 950 }}>{i+1}</button>)}</div></div><div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden", marginTop: 10 }}><div style={{ height: "100%", width: `${((step+1)/steps.length)*100}%`, background: `linear-gradient(90deg,${primary},#fff0b2)` }} /></div></section>{blockByStep[step]}<div style={{ display: "flex", gap: 8, marginBottom: 12 }}><button disabled={step===0} onClick={() => setStep((s)=>Math.max(0,s-1))} style={{ flex: 1, height: 42, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: step===0?"#555a72":"#fff", fontWeight: 950 }}>← Précédent</button><button disabled={step===steps.length-1} onClick={() => setStep((s)=>Math.min(steps.length-1,s+1))} style={{ flex: 1, height: 42, borderRadius: 999, border: `1px solid ${primary}`, background: soft, color: step===steps.length-1?"#555a72":primary, fontWeight: 950 }}>Suivant →</button></div></> : <>{participants}{reign}{chaos}{input}{summary}</>}

      {(view === "complete" || step === steps.length - 1) ? <button disabled={!valid} onClick={onStart} style={{ width: "100%", minHeight: 54, borderRadius: 999, border: valid ? `1px solid ${primary}` : "1px solid rgba(255,255,255,.1)", background: valid ? `linear-gradient(90deg,#b68b31,${primary},#fff0b2)` : "rgba(255,255,255,.05)", color: valid ? "#100d06" : "rgba(255,255,255,.38)", fontWeight: 1100, letterSpacing: 1.2, boxShadow: valid ? `0 0 24px ${primary}44` : "none" }}>DÉMARRER KILO DE MERDE</button> : null}
    </div>
  </div>;
}
