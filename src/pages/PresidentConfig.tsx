// @ts-nocheck
// =============================================================
// PRÉSIDENT — configuration guidée / complète
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import BotPagedSelector from "../components/BotPagedSelector";
import InfoDot from "../components/InfoDot";
import OptionRow from "../components/OptionRow";
import OptionSelect from "../components/OptionSelect";
import OptionToggle from "../components/OptionToggle";
import PageHeader from "../components/PageHeader";
import tickerPresident from "../assets/tickers/ticker_president.png";
import PlayerPagedSelector from "../components/PlayerPagedSelector";
import { useTheme } from "../contexts/ThemeContext";
import { loadBotPlayers } from "../lib/bots";
import { PRESIDENT_DECK_SIZE, PRESIDENT_CLASSIC_DECK_SIZE, presidentCardsPerPlayer, type PresidentConfigPayload } from "../lib/gameEngines/presidentEngine";
import { recordProfileUsageForMode } from "../lib/profileUsage";
import {
  PillButton,
  SelectedParticipantsCompactBlock,
  X01_PRO_BOTS,
  x01MostUsedDartSetIdForProfile,
} from "./X01ConfigV3";

export type { PresidentConfigPayload } from "../lib/gameEngines/presidentEngine";

type BotLite = { id: string; name: string; avatarDataUrl?: string | null; avatarUrl?: string | null; avatar?: string | null; botLevel?: string; isBot?: boolean };
const LS_KEY = "dc_modecfg_president_v1";
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
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.48 }}>
    <div><b style={{ color }}>DEUX JEUX, DEUX RÈGLES</b><br />PRÉSIDENT : plis, rangs et points. KILO DE MERDE : échange de quatre cartes, dernier à taper, pénalités en kilos et chasse d'eau sur le 7 du tas. Ils ne partagent pas le même comptage.</div>
    <div><b style={{ color }}>OBJECTIF</b><br />Débarrasse-toi de ta main virtuelle avant les autres. Le premier devient Président, le dernier Trou du cul.</div>
    <div><b style={{ color }}>CLASSEMENT</b><br />Le Président reçoit N−1 points pour N joueurs, le suivant N−2, et le dernier 0. Exemple à 5 : 4 / 3 / 2 / 1 / 0. Les plis n'octroient pas de points ; ils restent des statistiques. Aucune pénalité en kilos au Président.</div>
    <div><b style={{ color }}>CARTES & CIBLES</b><br />S = 1 carte, D = 2 cartes, T = 3 cartes. En ciblage fixe, le rang correspond au segment ; en Expert, chaque rang peut être associé à un des 20 segments. Le nombre de tentatives se règle dans la configuration.</div>
    <div><b style={{ color }}>PLI</b><br />À l’ouverture tu choisis une combinaison de ta main. Ensuite il faut jouer la même combinaison avec une valeur supérieure. Quand tous les autres passent, le dernier joueur ayant réussi reprend la main.</div>
    <div><b style={{ color }}>HIÉRARCHIE</b><br />Président, Vice-Président, Citoyen, Vice-Trou du cul, Trou du cul selon le nombre de joueurs.</div>
    <div><b style={{ color }}>TAXE</b><br />À la manche suivante, le dernier donne ses 2 meilleures cartes au Président, qui lui rend ses 2 plus faibles. À 4 joueurs ou plus, VP/VTC échangent aussi 1 carte.</div>
    <div><b style={{ color }}>PAQUET CLASSIQUE</b><br />PRÉSIDENT classique : les 52 cartes sont distribuées, aucun Joker. PRÉSIDENT CHAOS : deux Jokers MSS supplémentaires activés dans cette variante uniquement.</div>
    <div><b style={{ color: "#ffcf66" }}>CHAOS</b><br />Optionnel : BULL joker sur un simple, DBULL Coup d’État, brelan d’As = Révolution qui inverse l’ordre des valeurs jusqu’à la fin de la manche.</div>
  </div>;
}

function PresidentCardPreview({ color }: { color: string }) {
  return <div style={{ width: "min(250px, 72vw)", aspectRatio: "3 / 4", margin: "8px auto 4px", borderRadius: 24, padding: 10, background: "linear-gradient(145deg,#0a0a0b,#15110a)", border: `2px solid ${color}`, boxShadow: `0 0 30px ${color}35, inset 0 0 0 3px rgba(255,255,255,.035)` }}>
    <div style={{ height: "100%", borderRadius: 17, border: `1px solid ${color}88`, display: "grid", gridTemplateRows: "auto auto 1fr auto", padding: 13, background: "radial-gradient(circle at 50% 55%, rgba(233,197,108,.12), transparent 45%), linear-gradient(180deg,rgba(255,255,255,.035),rgba(0,0,0,.22))" }}>
      <div style={{ textAlign: "center", color, fontSize: 18, fontWeight: 1000, letterSpacing: 1.4 }}>♛ PRÉSIDENT</div>
      <div style={{ margin: "10px auto 0", padding: "5px 10px", borderRadius: 999, border: `1px solid ${color}77`, color: "#f5e6ba", fontSize: 9.5, fontWeight: 950, letterSpacing: 1.2 }}>CIBLE À BATTRE</div>
      <div style={{ alignSelf: "center", textAlign: "center" }}><div style={{ color, fontSize: 58, lineHeight: .95, fontFamily: "Georgia,serif", fontWeight: 1000, textShadow: `0 0 18px ${color}55` }}>D7</div><div style={{ marginTop: 9, color: "#f7e5b1", fontSize: 15, fontWeight: 950, letterSpacing: 1.2 }}>PAIRE DE 7</div></div>
      <div style={{ textAlign: "center", color: "rgba(255,255,255,.66)", fontSize: 9.5 }}>S = simple · D = paire · T = brelan</div>
    </div>
  </div>;
}

export default function PresidentConfig(props: any) {
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
  const [botsPanelEnabled, setBotsPanelEnabled] = React.useState(saved.botsPanelEnabled === true);
  const [botLevel, setBotLevel] = React.useState(saved.botLevel === "easy" || saved.botLevel === "hard" ? saved.botLevel : "normal");
  const [rounds, setRounds] = React.useState<1 | 3 | 5 | 7 | 10>(([1,3,5,7,10].includes(Number(saved.rounds)) ? Number(saved.rounds) : 5) as any);
  const [handSize, setHandSize] = React.useState<number>(Math.max(5, Math.min(16, Number(saved.handSize || 10))));
  const deckCopies = 1 as const;
  const [variant, setVariant] = React.useState<"classic" | "chaos">(saved.variant === "chaos" ? "chaos" : "classic");
  const [bullJoker, setBullJoker] = React.useState(saved.bullJoker !== false);
  const [coupEtat, setCoupEtat] = React.useState(saved.coupEtat !== false);
  const [revolution, setRevolution] = React.useState(saved.revolution !== false);
  const [randomOrder, setRandomOrder] = React.useState(saved.randomOrder !== false);
  const [difficulty, setDifficulty] = React.useState<"discovery" | "classic" | "expert">(["discovery","classic","expert"].includes(saved.difficulty) ? saved.difficulty : "classic");
  const [targetMode, setTargetMode] = React.useState<"fixed" | "rotate" | "shuffle-round" | "shuffle-trick">(["fixed","rotate","shuffle-round","shuffle-trick"].includes(saved.targetMode) ? saved.targetMode : "fixed");
  const [selectionMode, setSelectionMode] = React.useState<"manual" | "assisted">(saved.selectionMode === "assisted" ? "assisted" : "manual");
  const [adviceLevel, setAdviceLevel] = React.useState<"off" | "light" | "full">(["off","light","full"].includes(saved.adviceLevel) ? saved.adviceLevel : "light");
  const [dartsPerAttempt, setDartsPerAttempt] = React.useState<1|2|3>(([1,2,3].includes(Number(saved.dartsPerAttempt)) ? Number(saved.dartsPerAttempt) : 3) as 1|2|3);
  const [scoreInputMethod, setScoreInputMethod] = React.useState<"keypad" | "dartboard">(saved.scoreInputMethod === "dartboard" ? "dartboard" : "keypad");
  const [view, setView] = React.useState<"guided" | "complete">(() => { try { return localStorage.getItem("dc_president_config_view") === "complete" ? "complete" : "guided"; } catch { return "guided"; } });
  const [step, setStep] = React.useState(0);
  const steps = ["Participants", "Règne", "Variante", "Difficulté", "Résumé"];

  React.useEffect(() => {
    const map = new Map<string, BotLite>();
    (X01_PRO_BOTS || []).forEach((bot: any) => map.set(String(bot.id), { ...bot, id: String(bot.id), isBot: true }));
    loadUserBots().forEach((bot) => map.set(bot.id, bot));
    setBotProfiles([...map.values()]);
  }, []);
  React.useEffect(() => { if (!selectedIds.length && humanProfiles.length >= 3) setSelectedIds(humanProfiles.slice(0, 3).map((p) => String(p.id))); }, [humanProfiles, selectedIds.length]);
  React.useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ selectedIds, playerDartSets, botsPanelEnabled, botLevel, rounds, handSize, deckCopies, variant, bullJoker, coupEtat, revolution, randomOrder, scoreInputMethod, difficulty, targetMode, selectionMode, adviceLevel, dartsPerAttempt })); } catch {}
  }, [selectedIds, playerDartSets, botsPanelEnabled, botLevel, rounds, handSize, deckCopies, variant, bullJoker, coupEtat, revolution, randomOrder, scoreInputMethod, difficulty, targetMode, selectionMode, adviceLevel, dartsPerAttempt]);

  const allProfiles = React.useMemo(() => [...humanProfiles, ...botProfiles.map((p) => ({ ...p, isBot: true }))], [humanProfiles, botProfiles]);
  const byId = React.useMemo(() => new Map(allProfiles.map((p: any) => [String(p.id), p])), [allProfiles]);
  const selectedProfiles = selectedIds.map((id) => byId.get(id)).filter(Boolean) as any[];
  const selectedItems = selectedProfiles.map((profile: any) => ({ id: String(profile.id), kind: isBotLike(profile) ? "bot" : "player", name: profile?.name || profile?.displayName || "Joueur", profile }));
  const selectedBotCount = selectedProfiles.filter(isBotLike).length;
  const maxPlayers = 8;
  const valid = selectedIds.length >= 3 && selectedIds.length <= maxPlayers;
  const deckCapacity = variant === "chaos" ? PRESIDENT_DECK_SIZE : PRESIDENT_CLASSIC_DECK_SIZE;
  const actualHandSize = variant === "classic" ? Math.ceil(52/(selectedIds.length||3)) : presidentCardsPerPlayer(selectedIds.length || 3, handSize);
  const needCards = selectedIds.length * actualHandSize;
  const deckWarning = variant === "chaos" && actualHandSize < handSize;

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
    const payload: PresidentConfigPayload = {
      mode: "president", players: orderedIds.length, selectedIds: orderedIds,
      playersList: orderedProfiles.map((p: any) => ({ ...p, id: String(p.id), name: p?.name || p?.displayName || "Joueur", dartSetId: playerDartSets[String(p.id)] ?? null })),
      playerDartSets, botIds, botsEnabled: botIds.length > 0, botLevel, rounds, handSize: actualHandSize, deckCopies,
      variant, randomOrder, bullJoker: variant === "chaos" && bullJoker, coupEtat: variant === "chaos" && coupEtat,
      revolution: variant === "chaos" && revolution, scoreInputMethod, difficulty, targetMode, selectionMode, adviceLevel, dartsPerAttempt,
    };
    try { recordProfileUsageForMode("president", orderedIds); } catch {}
    if (typeof go === "function") go("president_play", payload);
  }
  function back() { if (typeof props?.onBack === "function") return props.onBack(); if (typeof go === "function") go("games"); }

  const card: React.CSSProperties = { borderRadius: 18, padding: 14, background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(0,0,0,.26))", border: `1px solid ${primary}38`, boxShadow: "0 14px 32px rgba(0,0,0,.38)", marginBottom: 12, minWidth: 0, overflow: "hidden" };
  const rowHelp: React.CSSProperties = { marginTop: 8, color: muted, fontSize: 10.8, lineHeight: 1.45 };

  const participants = <section style={card}>
    <div style={{ color: primary, fontWeight: 1000, fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>PARTICIPANTS</div>
    <SelectedParticipantsCompactBlock items={selectedItems} accent={primary} onRemove={togglePlayer} playerDartSets={playerDartSets} onDartSetChange={(id: string, setId: string | null) => setPlayerDartSets((p) => ({ ...p, [id]: setId }))} allProfiles={humanProfiles} />
    <PlayerPagedSelector usageMode="president" profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={primary} pageSize={9} modalTitle="Choisir les joueurs" showSelectedSummary={false} />
    <div style={rowHelp}>{"3 à 8 joueurs. La hiérarchie et les taxes sont individuelles."}</div>
    <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><b style={{ color: primary, fontSize: 12 }}>BOTS IA</b><button onClick={() => setBotsPanelEnabled((v) => !v)} style={{ borderRadius: 999, border: `1px solid ${primary}88`, padding: "7px 11px", background: botsPanelEnabled ? soft : "rgba(255,255,255,.04)", color: primary, fontWeight: 950 }}>{botsPanelEnabled ? "☑ ON" : "☐ OFF"}</button></div>
    {botsPanelEnabled ? <div style={{ marginTop: 10 }}><BotPagedSelector bots={botProfiles as any} selectedIds={selectedIds} onToggle={togglePlayer} accent={primary} label="BOTS IA" showCheckbox={false} showSelectedSummary={false} /></div> : null}
    {selectedBotCount ? <OptionRow label="Difficulté IA"><OptionSelect value={botLevel} options={[{ value: "easy", label: "Facile" }, { value: "normal", label: "Normal" }, { value: "hard", label: "Difficile" }]} onChange={setBotLevel} /></OptionRow> : null}
    <div style={{ marginTop: 10, padding: 9, borderRadius: 12, background: valid ? `${primary}0d` : "rgba(255,70,100,.08)", border: `1px solid ${valid ? primary + "45" : "rgba(255,110,130,.3)"}`, color: valid ? primary : "#ff9bb0", fontSize: 11, fontWeight: 900 }}>{valid ? `${selectedIds.length} joueurs sélectionnés — prêt.` : `Sélectionne entre 3 et ${maxPlayers} joueurs.`}</div>
  </section>;

  const reign = <section style={card}><div style={{ color: primary, fontWeight: 1000, fontSize: 12, letterSpacing: 1, marginBottom: 7 }}>FORMAT DU RÈGNE</div>
    <OptionRow label="Manches"><OptionSelect value={rounds} options={[1,3,5,7,10]} onChange={(v: any) => setRounds(Number(v) as any)} /></OptionRow>
    {variant === "classic" ? <div style={rowHelp}>Les 52 cartes sont distribuées entièrement. Certains joueurs reçoivent une carte de plus quand le partage n'est pas exact.</div> : <OptionRow label="Cartes / joueur"><OptionSelect value={handSize} options={[6,8,10,12,14,16]} onChange={(v: any) => setHandSize(Number(v))} /></OptionRow>}
    <div style={{ ...rowHelp, color: primary, fontWeight: 900 }}>{variant === "classic" ? "Paquet classique de 52 cartes sans Joker : tout le paquet est distribué." : "PRÉSIDENT CHAOS : paquet MSS de 54 cartes (52 + 2 Jokers uniques)."}</div>
    <OptionRow label="Ordre de départ aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow>
    <div style={rowHelp}>{"Chaque manche redistribue une main. Dès la manche 2, échanges de taxes entre rôles."}</div>
    <div style={{ marginTop: 8, color: deckWarning ? "#ffd36e" : "#83e6bd", fontSize: 11, fontWeight: 850 }}>{variant === "classic" ? `${selectedIds.length||3} joueurs · 52 cartes distribuées intégralement (mains de ${Math.floor(52/(selectedIds.length||3))} à ${actualHandSize} cartes).` : `${selectedIds.length||3} joueurs × ${actualHandSize} cartes = ${needCards} distribuées · ${deckCapacity-needCards} restantes dans le tas ou paquet.`}{deckWarning ? ` Demande limitée à ${actualHandSize} pour éviter tout doublon.` : ""}</div>
  </section>;

  const chaos = <section style={card}><div style={{ color: primary, fontWeight: 1000, fontSize: 12, letterSpacing: 1, marginBottom: 7 }}>VARIANTE</div>
    <OptionRow label="Mode"><OptionSelect value={variant} options={[{ value: "classic", label: "Président classique" }, { value: "chaos", label: "Président Chaos" }, ]} onChange={setVariant} /></OptionRow>
    {variant === "chaos" ? <><OptionRow label="BULL = Joker simple"><OptionToggle value={bullJoker} onChange={setBullJoker} /></OptionRow><OptionRow label="DBULL = Coup d'État"><OptionToggle value={coupEtat} onChange={setCoupEtat} /></OptionRow><OptionRow label="Brelan d’As = Révolution"><OptionToggle value={revolution} onChange={setRevolution} /></OptionRow></> : null}
    <div style={rowHelp}>{variant === "classic" ? "Président : points selon le classement (premier : N−1, dernier : 0). Pas de kilos ni chasse d’eau." : variant === "chaos" ? "Président Chaos : mêmes points par place, événements optionnels sur le dartboard." : "KILO DE MERDE : 4 cartes, échange vers la gauche, 4 identiques, dernier à taper pénalisé. Le 7 du tas déclenche la chasse d’eau intégrale."}</div>
    <PresidentCardPreview color={primary} />
  </section>;

  const input = <section style={card}><div style={{ color: primary, fontWeight: 1000, fontSize: 12, letterSpacing: 1, marginBottom: 7 }}>DIFFICULTÉ & SAISIE</div>
    <OptionRow label="Difficulté"><OptionSelect value={difficulty} options={[{value:"discovery",label:"Découverte"},{value:"classic",label:"Classique"},{value:"expert",label:"Expert"}]} onChange={(v: any)=>{
      setDifficulty(v); if(v==="discovery"){setTargetMode("fixed");setSelectionMode("assisted");setAdviceLevel("full");setDartsPerAttempt(3);}
      else if(v==="classic"){setTargetMode("fixed");setSelectionMode("manual");setAdviceLevel("light");setDartsPerAttempt(3);}
      else {setTargetMode("shuffle-round");setSelectionMode("manual");setAdviceLevel("light");setDartsPerAttempt(2);}
    }}/></OptionRow>
    <OptionRow label="Segments des cartes"><OptionSelect value={targetMode} options={[{value:"fixed",label:"Fixes (rangs = segments)"},{value:"rotate",label:"Rotation par manche"},{value:"shuffle-round",label:"Aléatoires par manche"},{value:"shuffle-trick",label:"Aléatoires par pli"}]} onChange={setTargetMode}/></OptionRow>
    <OptionRow label="Choix du coup"><OptionSelect value={selectionMode} options={[{value:"manual",label:"Manuel : choix obligatoire"},{value:"assisted",label:"Assisté : proposé automatiquement"}]} onChange={setSelectionMode}/></OptionRow>
    <OptionRow label="Conseils Awena"><OptionSelect value={adviceLevel} options={[{value:"off",label:"Désactivés"},{value:"light",label:"Discrets"},{value:"full",label:"Complets"}]} onChange={setAdviceLevel}/></OptionRow>
    <OptionRow label="Fléchettes / coup"><OptionSelect value={dartsPerAttempt} options={[{value:3,label:"3 tentatives"},{value:2,label:"2 tentatives"},{value:1,label:"1 tentative"}]} onChange={(v:any)=>setDartsPerAttempt(Number(v) as 1|2|3)}/></OptionRow>
    <div style={rowHelp}>Les rangs des cartes ne changent jamais : seul le segment à toucher varie. S = 1 carte, D = 2 cartes, T = 3 cartes. Rotation et tirages utilisent les 20 segments sans doublons parmi les 13 rangs. Le mode « par pli » redéfinit les cibles à chaque nouveau pli.</div>
    <OptionRow label="Mode de saisie"><OptionSelect value={scoreInputMethod} options={[{ value: "keypad", label: "Keypad X01" }, { value: "dartboard", label: "Cible interactive" }]} onChange={setScoreInputMethod} /></OptionRow>
    <div style={rowHelp}>La carte et sa cible physique sont affichées ensemble. En fixe : paire de 7 → D7 ; en ciblage variable, la même paire peut demander D18. Une touche exacte valide la combinaison.</div>
  </section>;

  const summary = <section style={card}><div style={{ color: primary, fontWeight: 1000, fontSize: 12, letterSpacing: 1, marginBottom: 9 }}>RÉSUMÉ</div>
    <div style={{ display: "grid", gap: 7, fontSize: 11.5 }}>
      {[["Participants", `${selectedIds.length} joueurs`],["Règne", `${rounds} manche${rounds > 1 ? "s" : ""}`],["Main", `${actualHandSize} cartes/joueur${deckWarning ? ` (au lieu de ${handSize})` : ""}`],["Paquet", `Unique · ${deckCapacity} cartes`],["Variante", variant === "chaos" ? "CHAOS" : "CLASSIQUE"],["Difficulté", `${difficulty} · ${targetMode} · ${dartsPerAttempt} fléchette(s)`],["Choix du coup", selectionMode === "manual" ? "Manuel obligatoire" : "Assisté"],["Saisie", scoreInputMethod === "dartboard" ? "Cible interactive" : "Keypad"]].map(([a,b]) => <div key={a as string} style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,.06)" }}><span style={{ color: muted }}>{a}</span><b>{b}</b></div>)}
    </div>
  </section>;

  const blockByStep = [participants, reign, chaos, input, summary];

  return <div style={{ minHeight: "100dvh", paddingBottom: 90, overflowX: "hidden" }}>
    <PageHeader tickerSrc={tickerPresident} tickerAlt="PRÉSIDENT" tickerFit="contain" tickerHeight={90} tickerEdgeFade="strong" tickerBottomGap={8} left={<BackDot onClick={back} color={primary} glow={`${primary}77`} title="Retour" />} right={<InfoDot title="Règles du Président" color={primary} glow={`${primary}77`} content={<Rules color={primary}/>} />} />
    <div style={{ padding: "8px 8px 0", maxWidth: 920, margin: "0 auto" }}>
      <section style={{ ...card, border: `1px solid ${primary}68` }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><div><div style={{ color: primary, fontWeight: 1000, letterSpacing: 1 }}>CONFIGURATION PRÉSIDENT</div><div style={{ color: muted, fontSize: 10.5, marginTop: 4 }}>Main virtuelle · plis · hiérarchie · taxes</div></div><div style={{ display: "flex", gap: 7 }}><PillButton label="Guidée" active={view === "guided"} onClick={() => { setView("guided"); try { localStorage.setItem("dc_president_config_view", "guided"); } catch {} }} primary={primary} primarySoft={soft} /><PillButton label="Complète" active={view === "complete"} onClick={() => { setView("complete"); try { localStorage.setItem("dc_president_config_view", "complete"); } catch {} }} primary={primary} primarySoft={soft} /></div></div></section>

      {view === "guided" ? <><section style={card}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div><b style={{ color: primary }}>Étape {step + 1}/{steps.length}</b><div style={{ color: muted, fontSize: 10.5 }}>{steps[step]}</div></div><div style={{ display: "flex", gap: 4 }}>{steps.map((s,i) => <button key={s} onClick={() => setStep(i)} style={{ width: 26, height: 26, borderRadius: 999, border: `1px solid ${i === step ? primary : "rgba(255,255,255,.1)"}`, background: i === step ? soft : "rgba(255,255,255,.03)", color: i === step ? primary : muted, fontWeight: 950 }}>{i+1}</button>)}</div></div><div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,.08)", overflow: "hidden", marginTop: 10 }}><div style={{ height: "100%", width: `${((step+1)/steps.length)*100}%`, background: `linear-gradient(90deg,${primary},#fff0b2)` }} /></div></section>{blockByStep[step]}<div style={{ display: "flex", gap: 8, marginBottom: 12 }}><button disabled={step===0} onClick={() => setStep((s)=>Math.max(0,s-1))} style={{ flex: 1, height: 42, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", color: step===0?"#555a72":"#fff", fontWeight: 950 }}>← Précédent</button><button disabled={step===steps.length-1} onClick={() => setStep((s)=>Math.min(steps.length-1,s+1))} style={{ flex: 1, height: 42, borderRadius: 999, border: `1px solid ${primary}`, background: soft, color: step===steps.length-1?"#555a72":primary, fontWeight: 950 }}>Suivant →</button></div></> : <>{participants}{reign}{chaos}{input}{summary}</>}

      {(view === "complete" || step === steps.length - 1) ? <button disabled={!valid} onClick={onStart} style={{ width: "100%", minHeight: 54, borderRadius: 999, border: valid ? `1px solid ${primary}` : "1px solid rgba(255,255,255,.1)", background: valid ? `linear-gradient(90deg,#b68b31,${primary},#fff0b2)` : "rgba(255,255,255,.05)", color: valid ? "#100d06" : "rgba(255,255,255,.38)", fontWeight: 1100, letterSpacing: 1.2, boxShadow: valid ? `0 0 24px ${primary}44` : "none" }}>DÉMARRER LE RÈGNE</button> : null}
    </div>
  </div>;
}
