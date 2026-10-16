// @ts-nocheck
// =============================================================
// DARTS POKER — configuration guidée / complète
// UX gameplay-first : comprendre le jeu avant de le paramétrer.
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

const CONFIG_STEPS = [
  { label: "Joueurs", short: "TABLE", color: GOLD, hint: "Qui joue ?" },
  { label: "Format", short: "PARTIE", color: RED, hint: "Combien de manches ?" },
  { label: "Pouvoirs", short: "RÈGLES", color: GOLD, hint: "Quels bonus ?" },
  { label: "Saisie", short: "SAISIE", color: GREEN, hint: "Comment scorer ?" },
  { label: "Résumé", short: "LANCER", color: BLUE, hint: "Tout est prêt" },
];

const ROUND_CHOICES = [
  { value: 3, title: "3 MANCHES", subtitle: "Express", color: GREEN },
  { value: 5, title: "5 MANCHES", subtitle: "Standard · conseillé", color: GOLD },
  { value: 7, title: "7 MANCHES", subtitle: "Long", color: BLUE },
  { value: 10, title: "10 MANCHES", subtitle: "Marathon", color: RED },
] as const;

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
    <div><strong style={{ color: RED }}>MAIN</strong><br />Chaque joueur dispose de 6 fléchettes, jouées une par une, pour construire la meilleure combinaison de 5 cartes.</div>
    <div><strong style={{ color: GREEN }}>POUVOIRS</strong><br />Simple = carte. Double = carte + Échange. Triple = carte + Choix de 2 cartes.</div>
    <div><strong style={{ color: GOLD }}>BULLS</strong><br />Bull = Choix de 2 cartes. Double Bull = Joker, limité à un Joker par main.</div>
    <div><strong style={{ color: "#fff" }}>CLASSEMENT</strong><br />Carte haute, paire, double paire, brelan, suite, couleur, full, carré, quinte flush et quinte flush royale.</div>
    <div><strong style={{ color: GOLD }}>CONTRAT</strong><br />Chaque manche peut proposer un objectif bonus. Le réussir rapporte un point supplémentaire.</div>
    <div><strong style={{ color: BLUE }}>DECK MSS</strong><br />Les figures sont incarnées par les personnages de MULTISPORTS SCORING : Awena, Firefighter, Killer et Loterie.</div>
    <div><strong style={{ color: RED }}>VICTOIRE</strong><br />La meilleure main rapporte un point. Le classement final se joue au total de points, puis aux victoires.</div>
  </div>;
}

function ConfigHero({ soft }: { soft: string }) {
  const flow = [
    ["1", "VISE", "un secteur 1–20", GOLD],
    ["2", "GAGNE", "la carte affichée", GREEN],
    ["3", "ALTERNE", "1 fléchette chacun", BLUE],
    ["4", "AMÉLIORE", "ta main + pouvoirs", RED],
    ["5", "SHOWDOWN", "meilleures 5 cartes", GOLD],
  ];
  return <section className="dp-config-hero" style={{ borderRadius: 18, border: `1px solid ${GOLD}55`, background: "radial-gradient(circle at 50% -30%,rgba(246,194,86,.18),rgba(8,9,13,.96) 64%)", padding: 10, marginBottom: 9, boxShadow: "0 14px 36px rgba(0,0,0,.30)" }}>
    <div style={{ textAlign: "center" }}>
      <div style={{ color: GOLD, fontSize: 10.5, fontWeight: 1100, letterSpacing: .9 }}>DARTS POKER EN 20 SECONDES</div>
      <div style={{ color: "#fff", fontSize: 13, fontWeight: 1050, marginTop: 2 }}>Construis la meilleure main de poker avec tes fléchettes.</div>
      <div style={{ color: soft, fontSize: 8, marginTop: 3 }}>Le secteur donne la carte. La bague S / D / T décide du pouvoir. Chaque joueur lance une seule fléchette à la fois.</div>
    </div>
    <div className="dp-config-flow" style={{ marginTop: 9 }}>
      {flow.map(([n, title, subtitle, color]: any, index) => <React.Fragment key={String(title)}>
        <div style={{ minWidth: 0, textAlign: "center", padding: "7px 4px", borderRadius: 12, border: `1px solid ${color}44`, background: `${color}09` }}>
          <div style={{ width: 20, height: 20, borderRadius: 999, margin: "0 auto", display: "grid", placeItems: "center", background: color, color: "#08090c", fontSize: 8, fontWeight: 1200 }}>{n}</div>
          <div style={{ color, fontSize: 7.4, fontWeight: 1150, marginTop: 4 }}>{title}</div>
          <div style={{ color: soft, fontSize: 5.9, marginTop: 1, lineHeight: 1.2 }}>{subtitle}</div>
        </div>
        {index < flow.length - 1 ? <div className="dp-config-arrow" style={{ color: "rgba(255,255,255,.24)", fontSize: 11, fontWeight: 1200 }}>›</div> : null}
      </React.Fragment>)}
    </div>
    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5 }}>
      <HeroFact label="MARCHÉ" value="20 CARTES" color={GOLD} />
      <HeroFact label="TOUR" value="1 FLÉCHETTE CHACUN" color={GREEN} />
      <HeroFact label="MAIN" value="6 FLÉCHETTES / JOUEUR" color={BLUE} />
    </div>
  </section>;
}

function HeroFact({ label, value, color }: any) {
  return <div style={{ minWidth: 0, borderRadius: 10, padding: "6px 4px", textAlign: "center", border: `1px solid ${color}33`, background: `${color}08` }}><div style={{ color: SOFT, fontSize: 5.8, fontWeight: 950 }}>{label}</div><div style={{ color, fontSize: 7.2, fontWeight: 1100, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div></div>;
}

function GuidedStepIntro({ number, title, text, color }: any) {
  return <div style={{ display: "grid", gridTemplateColumns: "34px minmax(0,1fr)", gap: 8, alignItems: "center", padding: "7px 8px", marginBottom: 9, borderRadius: 12, border: `1px solid ${color}38`, background: `${color}08` }}>
    <div style={{ width: 30, height: 30, borderRadius: 999, display: "grid", placeItems: "center", background: color, color: "#08090c", fontWeight: 1200, fontSize: 11 }}>{number}</div>
    <div><div style={{ color, fontSize: 8.5, fontWeight: 1150, letterSpacing: .5 }}>{title}</div><div style={{ color: SOFT, fontSize: 7.3, marginTop: 2, lineHeight: 1.35 }}>{text}</div></div>
  </div>;
}

function PowerStrip({ soft = SOFT }: { soft?: string }) {
  const rows = [
    ["S", "CARTE", "Prends la carte du secteur", "#d9dde6"],
    ["D", "+ ÉCHANGE", "Carte + échange d'une carte", BLUE],
    ["T", "+ CHOIX", "Carte + tirer 2 / garder 1", GOLD],
    ["25", "CHOIX 2→1", "Tire 2 cartes / garde 1", GREEN],
    ["50", "JOKER", "Joker virtuel · max 1", RED],
  ];
  return <div className="dp-config-power-strip">
    {rows.map(([key, label, detail, color]: any) => <div key={key} style={{ minWidth: 0, borderRadius: 12, padding: "7px 4px", textAlign: "center", border: `1px solid ${color}44`, background: `${color}09` }}>
      <div style={{ color, fontSize: 11, fontWeight: 1200 }}>{key}</div>
      <div style={{ color: "#fff", fontSize: 6.8, fontWeight: 1050, marginTop: 2 }}>{label}</div>
      <div style={{ color: soft, fontSize: 5.5, lineHeight: 1.2, marginTop: 2 }}>{detail}</div>
    </div>)}
  </div>;
}

function ModeChoiceCard({ active, color, title, subtitle, detail, onClick }: any) {
  return <button type="button" onClick={onClick} style={{ minWidth: 0, minHeight: 64, padding: "8px 7px", borderRadius: 13, border: `1px solid ${active ? color : "rgba(255,255,255,.10)"}`, background: active ? `linear-gradient(180deg,${color}1c,${color}08)` : "rgba(255,255,255,.025)", color: "#fff", boxShadow: active ? `0 0 18px ${color}20` : "none", textAlign: "left", cursor: "pointer" }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center" }}><strong style={{ color: active ? color : "#fff", fontSize: 9 }}>{title}</strong>{active ? <span style={{ color, fontSize: 7, fontWeight: 1150 }}>✓ ACTIF</span> : null}</div>
    <div style={{ color: active ? "#fff" : SOFT, fontSize: 7.2, fontWeight: 950, marginTop: 3 }}>{subtitle}</div>
    {detail ? <div style={{ color: SOFT, fontSize: 6.2, lineHeight: 1.3, marginTop: 3 }}>{detail}</div> : null}
  </button>;
}

function GameFlowPreview({ rounds, players, powersEnabled, contractsEnabled }: any) {
  const rows = [
    ["01", "LANCERS", `Chaque joueur lance 1 fléchette à tour de rôle jusqu'à 6/${6}.`, GREEN],
    ["02", "MARCHÉ", "Chaque secteur gagné donne sa carte puis reçoit immédiatement une nouvelle carte.", GOLD],
    ["03", "POUVOIRS", powersEnabled ? "Échanges, choix et Joker peuvent améliorer la main avant validation." : "Pouvoirs spéciaux désactivés : construction de main pure.", RED],
    ["04", "SHOWDOWN", `La meilleure combinaison de 5 cartes gagne la manche${contractsEnabled ? ", puis le contrat ajoute son bonus" : ""}.`, BLUE],
  ];
  return <div style={{ marginTop: 8, display: "grid", gap: 5 }}>
    {rows.map(([n, title, text, color]: any) => <div key={n} style={{ display: "grid", gridTemplateColumns: "28px 72px minmax(0,1fr)", gap: 7, alignItems: "center", borderRadius: 10, padding: "6px 7px", background: "rgba(0,0,0,.22)", border: "1px solid rgba(255,255,255,.07)" }}><div style={{ color, fontSize: 8, fontWeight: 1200 }}>{n}</div><div style={{ color, fontSize: 7.2, fontWeight: 1100 }}>{title}</div><div style={{ color: SOFT, fontSize: 6.8, lineHeight: 1.3 }}>{text}</div></div>)}
    <div style={{ color: SOFT, fontSize: 6.5, textAlign: "center", marginTop: 1 }}>{players || 0} joueur{players > 1 ? "s" : ""} · {rounds} manche{rounds > 1 ? "s" : ""} · 6 fléchettes par joueur et par manche</div>
  </div>;
}

function PokerRankingMini() {
  const ranks = ["CARTE", "PAIRE", "2 PAIRES", "BRELAN", "SUITE", "COULEUR", "FULL", "CARRÉ", "QUINTE FLUSH", "ROYALE"];
  return <div style={{ marginTop: 8 }}><div style={{ color: SOFT, fontSize: 6.5, fontWeight: 1000, marginBottom: 4 }}>FORCE DES MAINS · DE LA PLUS FAIBLE À LA PLUS FORTE</div><div className="dp-poker-ranking">{ranks.map((rank, index) => <div key={rank} style={{ minWidth: 0, borderRadius: 8, padding: "5px 2px", textAlign: "center", background: index >= 7 ? `${GOLD}0c` : "rgba(255,255,255,.025)", border: `1px solid ${index >= 7 ? `${GOLD}33` : "rgba(255,255,255,.07)"}` }}><div style={{ color: index >= 7 ? GOLD : "#d7dae2", fontSize: 5.5, fontWeight: 1000 }}>{rank}</div></div>)}</div></div>;
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
  const [selectedIds, setSelectedIds] = React.useState<string[]>(unique(saved.selectedIds || []).slice(0, 8));
  const [botsPanel, setBotsPanel] = React.useState(Boolean(saved.botsPanel));
  const [botLevel, setBotLevel] = React.useState<DartsPokerBotLevel>(saved.botLevel === "easy" || saved.botLevel === "hard" ? saved.botLevel : "normal");
  const [rounds, setRounds] = React.useState<3 | 5 | 7 | 10>(([3,5,7,10].includes(Number(saved.rounds)) ? Number(saved.rounds) : 5) as any);
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
  const guidedCanAdvance = step !== 0 || valid;

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
      jokerEnabled, contractsEnabled, assistanceEnabled, autoDrawMissing, openHands, randomOrder, scoreInputMethod,
    };
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ...payload, botsPanel })); } catch {}
    try { recordProfileUsageForMode("darts_poker", ids); } catch {}
    if (typeof go === "function") go("darts_poker_play", payload);
  }

  const card: React.CSSProperties = { width: "100%", boxSizing: "border-box", borderRadius: 18, padding: 12, background: "linear-gradient(180deg,rgba(255,255,255,.065),rgba(0,0,0,.28))", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 14px 34px rgba(0,0,0,.28)" };
  const block: React.CSSProperties = { ...card, marginBottom: 10, background: "rgba(8,9,13,.96)", border: `1px solid ${GOLD}35` };

  const playersBlock = <section style={block}>
    <GuidedStepIntro number="1" title="COMPOSE TA TABLE" text="Choisis de 1 à 8 joueurs. Les bots peuvent prendre une place à la table comme n'importe quel adversaire." color={GOLD} />
    <SelectedParticipantsCompactBlock items={selectedItems} accent={GOLD} onRemove={togglePlayer} playerDartSets={playerDartSets} onDartSetChange={handleDartSet} allProfiles={humanProfiles} />
    <PlayerPagedSelector usageMode="darts_poker" profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={GOLD} pageSize={9} modalTitle="Choisir les joueurs" showSelectedSummary={false} />
    <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <strong style={{ color: selectedIds.length ? GREEN : "#ff9aa8", fontSize: 11 }}>{selectedIds.length ? `${selectedIds.length} joueur${selectedIds.length > 1 ? "s" : ""} à la table` : "Sélectionne au moins un joueur"}</strong>
      <button type="button" onClick={() => setBotsPanel((v) => !v)} style={{ borderRadius: 999, padding: "7px 11px", border: `1px solid ${RED}77`, background: botsPanel ? `${RED}18` : "rgba(255,255,255,.04)", color: "#fff", fontWeight: 950 }}>BOTS {botsPanel ? "ON" : "OFF"}</button>
    </div>
    {botsPanel ? <div style={{ marginTop: 10 }}><BotPagedSelector bots={customBots} selectedIds={selectedIds} onToggle={togglePlayer} accent={RED} label="BOTS POKER" showCheckbox={false} showSelectedSummary={false} /></div> : null}
    {selectedBots.length ? <div style={{ marginTop: 8 }}><OptionRow label="Niveau des Bots"><OptionSelect value={botLevel} options={[{ value: "easy", label: "Débutant" }, { value: "normal", label: "Joueur" }, { value: "hard", label: "Shark" }]} onChange={setBotLevel} /></OptionRow></div> : null}
    <div style={{ marginTop: 8, color: soft, fontSize: 7.2, lineHeight: 1.4, textAlign: "center" }}>Pendant la manche, les joueurs alternent après <strong style={{ color: "#fff" }}>chaque fléchette</strong>. Personne ne lance ses 6 fléchettes d'affilée.</div>
  </section>;

  const formatBlock = <section style={block}>
    <GuidedStepIntro number="2" title="CHOISIS LA DURÉE" text="Chaque manche donne 6 fléchettes à chaque joueur. Le dealer tourne à chaque nouvelle manche." color={RED} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>
      {ROUND_CHOICES.map((choice) => <ModeChoiceCard key={choice.value} active={rounds === choice.value} color={choice.color} title={choice.title} subtitle={choice.subtitle} detail={`${choice.value * 6} fléchettes par joueur sur le match`} onClick={() => setRounds(choice.value as any)} />)}
    </div>
    <div style={{ marginTop: 9, padding: "7px 8px", borderRadius: 11, border: `1px solid ${GOLD}38`, background: `${GOLD}08`, color: soft, fontSize: 7.4, lineHeight: 1.4 }}><strong style={{ color: GOLD }}>RÈGLE FIXE :</strong> 6 fléchettes par joueur et par manche, jouées une par une. Le moteur garde automatiquement les 5 meilleures cartes.</div>
    <div style={{ marginTop: 7 }}>
      <OptionRow label="Ordre aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow>
      <OptionRow label="Mains adverses visibles"><OptionToggle value={openHands} onChange={setOpenHands} /></OptionRow>
    </div>
  </section>;

  const powersBlock = <section style={block}>
    <GuidedStepIntro number="3" title="RÈGLES & POUVOIRS" text="La carte dépend du secteur touché. La bague ajoute éventuellement un pouvoir : S, D et T donnent donc la même carte." color={GOLD} />
    <PowerStrip soft={soft} />
    <div style={{ marginTop: 9 }}>
      <OptionRow label="Doubles / Triples spéciaux"><OptionToggle value={powersEnabled} onChange={setPowersEnabled} /></OptionRow>
      <OptionRow label="Double Bull = Joker"><OptionToggle value={jokerEnabled} onChange={setJokerEnabled} /></OptionRow>
      <OptionRow label="Contrat bonus par manche"><OptionToggle value={contractsEnabled} onChange={setContractsEnabled} /></OptionRow>
    </div>
    <div style={{ color: soft, fontSize: 7.4, lineHeight: 1.45, marginTop: 8 }}>Après les 6 fléchettes, le joueur entre en <strong style={{ color: GOLD }}>PHASE POUVOIRS</strong>, utilise ses jetons s'il le souhaite puis valide sa meilleure main. Les pouvoirs non utilisés sont perdus.</div>
    <PokerRankingMini />
  </section>;

  const inputBlock = <section style={block}>
    <GuidedStepIntro number="4" title="COMMENT SAISIR LES LANCERS ?" text="Une seule fléchette est saisie et validée à la fois. Choisis simplement l'interface qui te convient." color={GREEN} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
      <ModeChoiceCard active={scoreInputMethod === "keypad"} color={GOLD} title="CLAVIER" subtitle="S / D / T + numéro" detail="Le keypad commun à l'application. Rapide et compact." onClick={() => setScoreInputMethod("keypad")} />
      <ModeChoiceCard active={scoreInputMethod === "dartboard"} color={BLUE} title="CIBLE INTERACTIVE" subtitle="Touchez la zone" detail="Saisie visuelle depuis une cible de fléchettes." onClick={() => setScoreInputMethod("dartboard")} />
    </div>
    <div style={{ marginTop: 9, padding: 9, borderRadius: 13, border: `1px solid ${assistanceEnabled ? BLUE : "rgba(255,255,255,.10)"}`, background: assistanceEnabled ? `${BLUE}0a` : "rgba(255,255,255,.025)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div><div style={{ color: assistanceEnabled ? BLUE : "#fff", fontSize: 9, fontWeight: 1100 }}>ASSISTANCE STRATÉGIQUE</div><div style={{ color: soft, fontSize: 7, marginTop: 2 }}>Le marché indique PRIORITÉ / BONNE / UTILE / FAIBLE et explique pourquoi viser une carte.</div></div>
        <OptionToggle value={assistanceEnabled} onChange={setAssistanceEnabled} />
      </div>
      <div style={{ marginTop: 6, color: soft, fontSize: 6.6, lineHeight: 1.35 }}>L'assistance ne joue jamais à ta place et ne modifie aucun résultat : elle rend seulement le poker plus facile à lire.</div>
    </div>
  </section>;

  const summaryBlock = <section style={{ ...block, borderColor: `${GOLD}70`, background: `linear-gradient(135deg,${RED}12,${GOLD}0d)` }}>
    <GuidedStepIntro number="5" title="TABLE PRÊTE" text="Relis le déroulé ci-dessous. Si tout te convient, lance la partie : l'écran de jeu te guidera ensuite fléchette par fléchette." color={BLUE} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
      <HeroFact label="JOUEURS" value={`${selectedIds.length || 0}`} color={selectedIds.length ? GREEN : RED} />
      <HeroFact label="FORMAT" value={`${rounds} MANCHES`} color={GOLD} />
      <HeroFact label="SAISIE" value={scoreInputMethod === "dartboard" ? "CIBLE" : "CLAVIER"} color={BLUE} />
    </div>
    <GameFlowPreview rounds={rounds} players={selectedIds.length} powersEnabled={powersEnabled} contractsEnabled={contractsEnabled} />
    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 5 }}>
      <div style={{ borderRadius: 10, padding: "6px 7px", background: `${powersEnabled ? GREEN : RED}08`, border: `1px solid ${powersEnabled ? GREEN : RED}33` }}><div style={{ color: powersEnabled ? GREEN : RED, fontSize: 7, fontWeight: 1100 }}>{powersEnabled ? "✓ POUVOIRS ACTIFS" : "POKER PUR"}</div><div style={{ color: soft, fontSize: 6.2, marginTop: 2 }}>D/T {powersEnabled ? "ajoutent leurs jetons" : "sans bonus spécial"}</div></div>
      <div style={{ borderRadius: 10, padding: "6px 7px", background: `${contractsEnabled ? GOLD : "#777"}08`, border: `1px solid ${contractsEnabled ? GOLD : "#777"}33` }}><div style={{ color: contractsEnabled ? GOLD : SOFT, fontSize: 7, fontWeight: 1100 }}>{contractsEnabled ? "✓ CONTRATS +1 PT" : "CONTRATS OFF"}</div><div style={{ color: soft, fontSize: 6.2, marginTop: 2 }}>{contractsEnabled ? "objectif bonus à chaque manche" : "seule la main compte"}</div></div>
      <div style={{ borderRadius: 10, padding: "6px 7px", background: `${assistanceEnabled ? BLUE : "#777"}08`, border: `1px solid ${assistanceEnabled ? BLUE : "#777"}33` }}><div style={{ color: assistanceEnabled ? BLUE : SOFT, fontSize: 7, fontWeight: 1100 }}>{assistanceEnabled ? "✓ CONSEILS ON" : "CONSEILS OFF"}</div><div style={{ color: soft, fontSize: 6.2, marginTop: 2 }}>{assistanceEnabled ? "lecture stratégique du marché" : "aucune aide de ciblage"}</div></div>
      <div style={{ borderRadius: 10, padding: "6px 7px", background: `${openHands ? GREEN : RED}08`, border: `1px solid ${openHands ? GREEN : RED}33` }}><div style={{ color: openHands ? GREEN : RED, fontSize: 7, fontWeight: 1100 }}>{openHands ? "MAINS OUVERTES" : "MAINS CACHÉES"}</div><div style={{ color: soft, fontSize: 6.2, marginTop: 2 }}>{openHands ? "adversaires visibles" : "révélation au showdown"}</div></div>
    </div>
    <div style={{ marginTop: 9, padding: "7px 8px 5px", borderRadius: 14, border: "1px solid rgba(246,194,86,.26)", background: "radial-gradient(circle at 50% 0%,rgba(246,194,86,.08),rgba(255,255,255,.015) 70%)" }}>
      <div style={{ textAlign: "center", color: GOLD, fontSize: 7.5, fontWeight: 1100, letterSpacing: .8 }}>DECK MSS SIGNATURE · FIGURES DE L'APPLICATION</div>
      <DartsPokerDeckPreview />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6, marginTop: 4 }}>
        <button type="button" onClick={() => setShowDeckGallery(true)} style={{ minHeight: 34, borderRadius: 10, border: `1px solid ${GOLD}55`, background: `${GOLD}0d`, color: GOLD, fontSize: 8, fontWeight: 1050, letterSpacing: .35 }}>52 CARTES + JOKER</button>
        <button type="button" onClick={() => setShowBadgeGallery(true)} style={{ minHeight: 34, borderRadius: 10, border: `1px solid ${BLUE}55`, background: `${BLUE}0d`, color: BLUE, fontSize: 8, fontWeight: 1050, letterSpacing: .35 }}>12 BADGES · PROGRESSION</button>
      </div>
    </div>
  </section>;

  const contentByStep = [playersBlock, formatBlock, powersBlock, inputBlock, summaryBlock];

  return <div style={{ minHeight: "100dvh", color: theme?.text || "#fff", background: `radial-gradient(circle at 50% -10%,${RED}28 0,${theme?.bg || "#070912"} 43%,#020203 100%)`, paddingBottom: 18 }}>
    <ConfigStyles />
    <PageHeader tickerSrc={tickerDartsPoker} tickerAlt="DARTS POKER" left={<div style={{ marginLeft: 6 }}><BackDot onClick={back} color={GOLD} glow={`${GOLD}88`} /></div>} right={<div style={{ marginRight: 6 }}><InfoDot title="Règles DARTS POKER" color={RED} glow={`${RED}88`} content={<Rules />} /></div>} />
    <main style={{ width: "min(980px,100%)", margin: "0 auto", padding: "8px 9px", boxSizing: "border-box" }}>
      <ConfigHero soft={soft} />
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 10 }}><PillButton label="Guidé" active={viewMode === "guided"} onClick={() => chooseView("guided")} primary={GOLD} primarySoft={`${GOLD}18`} /><PillButton label="Complet" active={viewMode === "complete"} onClick={() => chooseView("complete")} primary={RED} primarySoft={`${RED}18`} /></div>

      {viewMode === "guided" ? <>
        <div className="dp-config-step-nav">{CONFIG_STEPS.map((item, index) => <button key={item.label} onClick={() => setStep(index)} style={{ minHeight: 46, borderRadius: 11, border: `1px solid ${step === index ? item.color : "rgba(255,255,255,.08)"}`, background: step === index ? `${item.color}18` : "rgba(255,255,255,.025)", color: step === index ? "#fff" : soft, padding: "5px 3px" }}><div style={{ color: step === index ? item.color : soft, fontSize: 7, fontWeight: 1200 }}>{index + 1} · {item.short}</div><div style={{ fontSize: 6, marginTop: 2 }}>{item.hint}</div></button>)}</div>
        {contentByStep[step]}
        <div style={{ display: "grid", gridTemplateColumns: step === 0 ? "1fr" : "1fr 1fr", gap: 8 }}>
          {step > 0 ? <button onClick={() => setStep((v) => Math.max(0, v - 1))} style={{ minHeight: 46, borderRadius: 14, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.05)", color: "#fff", fontWeight: 1000 }}>PRÉCÉDENT</button> : null}
          {step < CONFIG_STEPS.length - 1 ? <button disabled={!guidedCanAdvance} onClick={() => guidedCanAdvance && setStep((v) => Math.min(CONFIG_STEPS.length - 1, v + 1))} style={{ minHeight: 46, borderRadius: 14, border: `1px solid ${guidedCanAdvance ? GOLD : "#454850"}`, background: guidedCanAdvance ? `linear-gradient(135deg,${GOLD}24,${RED}18)` : "#22242a", color: guidedCanAdvance ? "#fff" : "#777d89", fontWeight: 1000, cursor: guidedCanAdvance ? "pointer" : "default" }}>{step === 0 && !valid ? "CHOISIS UN JOUEUR" : "SUIVANT"}</button> : <button disabled={!valid} onClick={start} style={{ minHeight: 50, borderRadius: 14, border: `1px solid ${valid ? GOLD : "#555"}`, background: valid ? `linear-gradient(135deg,${RED},#8e121d)` : "#282a30", color: "#fff", fontWeight: 1100, boxShadow: valid ? `0 0 24px ${RED}55` : "none" }}>♠ LANCER LA PARTIE</button>}
        </div>
      </> : <>
        <div className="dp-config-complete-grid">
          <div className="dp-config-wide">{playersBlock}</div>
          <div>{formatBlock}</div>
          <div>{powersBlock}</div>
          <div>{inputBlock}</div>
          <div>{summaryBlock}</div>
        </div>
        <button disabled={!valid} onClick={start} style={{ width: "100%", minHeight: 54, borderRadius: 16, border: `1px solid ${valid ? GOLD : "#555"}`, background: valid ? `linear-gradient(135deg,${RED},#8e121d)` : "#282a30", color: "#fff", fontWeight: 1100, boxShadow: valid ? `0 0 24px ${RED}55` : "none" }}>♠ DÉMARRER DARTS POKER</button>
      </>}
    </main>

    {showDeckGallery ? <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.90)", backdropFilter: "blur(9px)", display: "grid", placeItems: "center", padding: 8 }}><div style={{ width: "min(920px,100%)", maxHeight: "94dvh", overflow: "auto", borderRadius: 20, padding: 12, background: "linear-gradient(180deg,#14151b,#050609)", border: `1px solid ${GOLD}66`, boxShadow: "0 24px 70px rgba(0,0,0,.65)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 9 }}><div><div style={{ color: GOLD, fontSize: 11, fontWeight: 1100 }}>DECK MSS SIGNATURE</div><div style={{ color: soft, fontSize: 8, marginTop: 2 }}>Toutes les cartes utilisées par Darts Poker</div></div><button type="button" onClick={() => setShowDeckGallery(false)} style={{ minHeight: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.05)", color: "#fff", padding: "0 12px", fontWeight: 1000 }}>FERMER</button></div><DartsPokerDeckGallery /></div></div> : null}
    {showBadgeGallery ? <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.92)", backdropFilter: "blur(10px)", display: "grid", placeItems: "center", padding: 8 }}><div style={{ width: "min(960px,100%)", maxHeight: "94dvh", overflow: "auto", borderRadius: 22, padding: 12, background: "radial-gradient(circle at 50% 0%,rgba(85,199,255,.10),#090a0f 48%)", border: `1px solid ${BLUE}66`, boxShadow: "0 24px 70px rgba(0,0,0,.68)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}><div><div style={{ color: BLUE, fontSize: 11, fontWeight: 1100 }}>TROPHÉES DARTS POKER</div><div style={{ color: soft, fontSize: 8, marginTop: 2 }}>12 badges permanents · progression par joueur</div></div><button type="button" onClick={() => setShowBadgeGallery(false)} style={{ minHeight: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.05)", color: "#fff", padding: "0 12px", fontWeight: 1000 }}>FERMER</button></div><DartsPokerBadgeGallery profiles={selectedItems.filter((profile: any) => !isBotLike(profile))} catalogOnly={!selectedItems.some((profile: any) => !isBotLike(profile))} /></div></div> : null}
  </div>;
}

function ConfigStyles() {
  return <style>{`
    .dp-config-flow{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr) auto minmax(0,1fr) auto minmax(0,1fr) auto minmax(0,1fr);gap:3px;align-items:center}
    .dp-config-power-strip{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}
    .dp-poker-ranking{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:3px}
    .dp-config-step-nav{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin-bottom:9px}
    .dp-config-complete-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-items:start}
    .dp-config-complete-grid > div > section{margin-bottom:0!important}
    .dp-config-wide{grid-column:1 / -1}
    @media (max-width:720px){
      .dp-config-flow{grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}
      .dp-config-arrow{display:none}
      .dp-config-power-strip{grid-template-columns:repeat(5,minmax(0,1fr));gap:3px}
      .dp-poker-ranking{grid-template-columns:repeat(5,minmax(0,1fr));gap:3px}
      .dp-config-complete-grid{grid-template-columns:1fr}
      .dp-config-wide{grid-column:auto}
    }
    @media (max-width:430px){
      .dp-config-step-nav button{min-height:42px!important}
      .dp-config-step-nav button div:last-child{display:none}
      .dp-config-power-strip > div{padding-left:2px!important;padding-right:2px!important}
      .dp-config-hero{padding-left:7px!important;padding-right:7px!important}
    }
  `}</style>;
}
