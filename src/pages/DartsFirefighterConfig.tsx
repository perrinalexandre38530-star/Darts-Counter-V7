// @ts-nocheck
// =============================================================
// DARTS FIREFIGHTER — configuration guidée / complète
// Design aligné sur X01 / KILLER / DARTS RACER
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
import { TERRITORY_MAPS } from "../lib/territories/maps";
import { recordProfileUsageForMode } from "../lib/profileUsage";
import type { DartsFirefighterConfigPayload, DartsFirefighterDifficulty } from "../lib/gameEngines/dartsFirefighterEngine";
import { difficultyLabel } from "../lib/gameEngines/dartsFirefighterEngine";
import {
  PillButton,
  SelectedParticipantsCompactBlock,
  x01MostUsedDartSetIdForProfile,
} from "./X01ConfigV3";
import tickerFirefighter from "../assets/tickers/ticker_darts_firefighter.png";

const LS_KEY = "dc_modecfg_darts_firefighter_v1";
const FIRE = "#ff6b27";
const WATER = "#29c7ff";

type BotLevel = "easy" | "normal" | "hard";

function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    return value && typeof value === "object" ? value : {};
  } catch { return {}; }
}
function isBotLike(profile: any) {
  return Boolean(profile?.isBot || profile?.bot || profile?.type === "bot" || profile?.kind === "bot" || profile?.botLevel);
}
function unique(ids: any[]) {
  return Array.from(new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean)));
}
function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const MAP_OPTIONS = ["FR", "EU", "UN", "WORLD", "US", "CA", "AU", "ES", "IT", "DE", "UK", "BR", "AF", "ASIA", "NA", "SAM"]
  .filter((id) => TERRITORY_MAPS[id] || id === "UK")
  .map((id) => ({ value: id, label: id === "UK" ? "Royaume-Uni" : TERRITORY_MAPS[id]?.name || id }));

function Rules({ primary }: { primary: string }) {
  return <div style={{ display: "grid", gap: 11, fontSize: 13, lineHeight: 1.48 }}>
    <div><strong style={{ color: FIRE }}>MISSION</strong><br />Éteindre tous les foyers avant qu’une zone critique ou trop de territoires ne soient détruits.</div>
    <div><strong style={{ color: WATER }}>EAU</strong><br />Simple = 1 unité · Double = 2 · Triple = 3. Le surplus refroidit et protège le territoire.</div>
    <div><strong style={{ color: "#ffd76a" }}>CIBLES</strong><br />Chaque zone active reçoit un numéro unique de 1 à 20. La fléchette touchée détermine automatiquement le territoire traité.</div>
    <div><strong style={{ color: primary }}>BULL / DBULL</strong><br />Bull effectue un largage précis sur la zone sélectionnée. Double Bull déclenche le Canadair et arrose aussi les zones voisines.</div>
    <div><strong style={{ color: FIRE }}>PROPAGATION</strong><br />Après chaque volée, le feu peut gagner en intensité, créer de la fumée et se propager selon le vent. Une protection absorbe une propagation.</div>
    <div><strong style={{ color: WATER }}>BRIGADE</strong><br />En coopération, tous les joueurs partagent la même carte et le même score, tout en conservant leurs statistiques individuelles.</div>
  </div>;
}

export default function DartsFirefighterConfig(props: any) {
  const { theme } = useTheme();
  const store = props?.store ?? props?.params?.store;
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const saved = React.useMemo(readSaved, []);
  const primary = theme?.primary || FIRE;
  const primarySoft = theme?.primarySoft || `${primary}20`;
  const soft = theme?.textSoft || "#aeb2c8";

  const allProfiles = React.useMemo(() => Array.isArray(store?.profiles) ? store.profiles : [], [store?.profiles]);
  const humanProfiles = React.useMemo(() => allProfiles.filter((p: any) => !isBotLike(p)), [allProfiles]);
  const customBots = React.useMemo(() => {
    try { return loadBotPlayers().map((b: any) => ({ ...b, id: String(b.id), isBot: true })); }
    catch { return []; }
  }, []);
  const profilePool = React.useMemo(() => [...humanProfiles, ...customBots], [humanProfiles, customBots]);
  const byId = React.useMemo(() => new Map(profilePool.map((p: any) => [String(p.id), p])), [profilePool]);

  const [viewMode, setViewMode] = React.useState<"guided" | "complete">(() => localStorage.getItem("dc_firefighter_config_view") === "complete" ? "complete" : "guided");
  const [step, setStep] = React.useState(0);
  const steps = ["Brigade", "Carte", "Incendie", "Règles", "Résumé"];
  const [selectedIds, setSelectedIds] = React.useState<string[]>(unique(saved.selectedIds || []).slice(0, 8));
  const [botsPanel, setBotsPanel] = React.useState(Boolean(saved.botsPanel));
  const [botLevel, setBotLevel] = React.useState<BotLevel>(saved.botLevel === "easy" || saved.botLevel === "hard" ? saved.botLevel : "normal");
  const [mapId, setMapId] = React.useState(String(saved.mapId || "FR"));
  const [difficulty, setDifficulty] = React.useState<DartsFirefighterDifficulty>(["recruit", "firefighter", "commander", "inferno"].includes(saved.difficulty) ? saved.difficulty : "firefighter");
  const [activeTerritories, setActiveTerritories] = React.useState<12 | 16 | 20>(([12,16,20].includes(Number(saved.activeTerritories)) ? Number(saved.activeTerritories) : 20) as any);
  const [initialFires, setInitialFires] = React.useState(Math.max(1, Math.min(6, Number(saved.initialFires || 3))));
  const [criticalTerritories, setCriticalTerritories] = React.useState(Math.max(0, Math.min(5, Number(saved.criticalTerritories ?? 2))));
  const [maxRounds, setMaxRounds] = React.useState(Math.max(5, Math.min(50, Number(saved.maxRounds || 18))));
  const [windEnabled, setWindEnabled] = React.useState(saved.windEnabled !== false);
  const [forecastEnabled, setForecastEnabled] = React.useState(saved.forecastEnabled !== false);
  const [missEndsTurn, setMissEndsTurn] = React.useState(Boolean(saved.missEndsTurn));
  const [bullAirSupport, setBullAirSupport] = React.useState(saved.bullAirSupport !== false);
  const [randomOrder, setRandomOrder] = React.useState(Boolean(saved.randomOrder));
  const [scoreInputMethod, setScoreInputMethod] = React.useState<"keypad" | "dartboard">(saved.scoreInputMethod === "dartboard" ? "dartboard" : "keypad");
  const [playerDartSets, setPlayerDartSets] = React.useState<Record<string, string | null>>(saved.playerDartSets || {});

  React.useEffect(() => {
    setInitialFires((value) => Math.min(value, Math.max(1, Math.floor(activeTerritories / 3))));
    setCriticalTerritories((value) => Math.min(value, Math.max(0, Math.floor(activeTerritories / 4))));
  }, [activeTerritories]);

  function togglePlayer(id: string) {
    const key = String(id);
    setSelectedIds((prev) => prev.includes(key) ? prev.filter((x) => x !== key) : prev.length >= 8 ? prev : [...prev, key]);
    setPlayerDartSets((prev) => {
      if (Object.prototype.hasOwnProperty.call(prev, key)) return prev;
      return { ...prev, [key]: x01MostUsedDartSetIdForProfile(key) || null };
    });
  }
  function handleDartSet(id: string, dartSetId: string | null) {
    setPlayerDartSets((prev) => ({ ...prev, [String(id)]: dartSetId || null }));
  }

  const selectedItems = selectedIds.map((id) => byId.get(id)).filter(Boolean);
  const selectedBots = selectedItems.filter(isBotLike);
  const valid = selectedIds.length >= 1 && selectedIds.length <= 8;
  const missionLabel = `${difficultyLabel(difficulty)} · ${activeTerritories} zones · ${initialFires} foyer${initialFires > 1 ? "s" : ""}`;

  function chooseView(next: "guided" | "complete") {
    setViewMode(next);
    try { localStorage.setItem("dc_firefighter_config_view", next); } catch {}
  }
  function back() { if (typeof go === "function") go("games"); }
  function start() {
    if (!valid) return;
    const ids = randomOrder ? shuffle(selectedIds) : [...selectedIds];
    const playersList = ids.map((id) => byId.get(id)).filter(Boolean).map((profile: any) => ({
      ...profile,
      id: String(profile.id),
      name: profile?.name || profile?.displayName || "Pompier",
      dartSetId: playerDartSets[String(profile.id)] ?? null,
      isBot: isBotLike(profile),
    }));
    const botIds = playersList.filter(isBotLike).map((p: any) => String(p.id));
    const payload: DartsFirefighterConfigPayload = {
      mode: "darts_firefighter",
      players: ids.length,
      selectedIds: ids,
      playersList,
      playerDartSets,
      botIds,
      botsEnabled: botIds.length > 0,
      botLevel,
      mapId,
      difficulty,
      activeTerritories,
      initialFires,
      criticalTerritories,
      maxRounds,
      windEnabled,
      forecastEnabled,
      missEndsTurn,
      bullAirSupport,
      scoreInputMethod,
      randomOrder,
    };
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ...payload, botsPanel })); } catch {}
    try { recordProfileUsageForMode("darts_firefighter", ids); } catch {}
    if (typeof go === "function") go("darts_firefighter_play", payload);
  }

  const card: React.CSSProperties = { width: "100%", boxSizing: "border-box", borderRadius: 18, padding: 12, background: "linear-gradient(180deg,rgba(255,255,255,.065),rgba(0,0,0,.28))", border: "1px solid rgba(255,255,255,.10)", boxShadow: "0 14px 34px rgba(0,0,0,.28)" };
  const block: React.CSSProperties = { ...card, marginBottom: 10, background: "rgba(8,12,20,.95)", border: `1px solid ${primary}35` };

  const brigadeBlock = <section style={block}>
    <div style={{ color: WATER, fontSize: 12, fontWeight: 1000, letterSpacing: 1, marginBottom: 10 }}>BRIGADE D’INTERVENTION</div>
    <SelectedParticipantsCompactBlock items={selectedItems} accent={WATER} onRemove={togglePlayer} playerDartSets={playerDartSets} onDartSetChange={handleDartSet} allProfiles={humanProfiles} />
    <PlayerPagedSelector usageMode="darts_firefighter" profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={WATER} pageSize={9} modalTitle="Choisir les pompiers" showSelectedSummary={false} />
    <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <strong style={{ color: selectedIds.length ? WATER : "#ff9aa8", fontSize: 11 }}>{selectedIds.length ? `${selectedIds.length} pompier${selectedIds.length > 1 ? "s" : ""} prêt${selectedIds.length > 1 ? "s" : ""}` : "Sélectionne au moins un joueur"}</strong>
      <button type="button" onClick={() => setBotsPanel((v) => !v)} style={{ borderRadius: 999, padding: "7px 11px", border: `1px solid ${WATER}77`, background: botsPanel ? `${WATER}18` : "rgba(255,255,255,.04)", color: WATER, fontWeight: 950 }}>BOTS {botsPanel ? "ON" : "OFF"}</button>
    </div>
    {botsPanel ? <div style={{ marginTop: 10 }}><BotPagedSelector bots={customBots} selectedIds={selectedIds} onToggle={togglePlayer} accent={WATER} label="BOTS POMPIERS" showCheckbox={false} showSelectedSummary={false} /></div> : null}
    {selectedBots.length ? <div style={{ marginTop: 8 }}><OptionRow label="Niveau des Bots"><OptionSelect value={botLevel} options={[{ value: "easy", label: "Recrue" }, { value: "normal", label: "Confirmé" }, { value: "hard", label: "Élite" }]} onChange={setBotLevel} /></OptionRow></div> : null}
  </section>;

  const mapBlock = <section style={block}>
    <div style={{ color: "#ffd76a", fontSize: 12, fontWeight: 1000, letterSpacing: 1, marginBottom: 7 }}>TERRITOIRE</div>
    <OptionRow label="Carte"><OptionSelect value={mapId} options={MAP_OPTIONS} onChange={setMapId} /></OptionRow>
    <OptionRow label="Zones actives"><OptionSelect value={activeTerritories} options={[{ value: 12, label: "12 · Intervention rapide" }, { value: 16, label: "16 · Standard" }, { value: 20, label: "20 · Carte complète" }]} onChange={(v: any) => setActiveTerritories(Number(v) as any)} /></OptionRow>
    <div style={{ color: soft, fontSize: 10.5, lineHeight: 1.45, marginTop: 7 }}>Les zones jouables reçoivent les secteurs 1 à {activeTerritories}. Les autres restent visibles mais hors mission.</div>
  </section>;

  const fireBlock = <section style={block}>
    <div style={{ color: FIRE, fontSize: 12, fontWeight: 1000, letterSpacing: 1, marginBottom: 7 }}>INCENDIE</div>
    <OptionRow label="Difficulté"><OptionSelect value={difficulty} options={[{ value: "recruit", label: "Recrue · propagation lente" }, { value: "firefighter", label: "Pompier · équilibré" }, { value: "commander", label: "Commandant · tactique" }, { value: "inferno", label: "Inferno · extrême" }]} onChange={setDifficulty} /></OptionRow>
    <OptionRow label="Foyers initiaux"><OptionSelect value={initialFires} options={[1,2,3,4,5,6].filter((n) => n <= Math.floor(activeTerritories / 3))} onChange={(v: any) => setInitialFires(Number(v))} /></OptionRow>
    <OptionRow label="Zones critiques"><OptionSelect value={criticalTerritories} options={[0,1,2,3,4,5].filter((n) => n <= Math.floor(activeTerritories / 4))} onChange={(v: any) => setCriticalTerritories(Number(v))} /></OptionRow>
    <OptionRow label="Limite de rounds"><OptionSelect value={maxRounds} options={[8,10,12,15,18,20,25,30,40]} onChange={(v: any) => setMaxRounds(Number(v))} /></OptionRow>
  </section>;

  const rulesBlock = <section style={block}>
    <div style={{ color: WATER, fontSize: 12, fontWeight: 1000, letterSpacing: 1, marginBottom: 7 }}>RÈGLES D’INTERVENTION</div>
    <OptionRow label="Vent dynamique"><OptionToggle value={windEnabled} onChange={setWindEnabled} /></OptionRow>
    <OptionRow label="Prévision propagation"><OptionToggle value={forecastEnabled} onChange={setForecastEnabled} /></OptionRow>
    <OptionRow label="MISS termine la volée"><OptionToggle value={missEndsTurn} onChange={setMissEndsTurn} /></OptionRow>
    <OptionRow label="DBULL = Canadair"><OptionToggle value={bullAirSupport} onChange={setBullAirSupport} /></OptionRow>
    <OptionRow label="Ordre aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow>
    <OptionRow label="Saisie"><OptionSelect value={scoreInputMethod} options={[{ value: "keypad", label: "Clavier" }, { value: "dartboard", label: "Cible interactive" }]} onChange={setScoreInputMethod} /></OptionRow>
  </section>;

  const summaryBlock = <section style={{ ...block, borderColor: `${FIRE}66`, background: `linear-gradient(135deg,${FIRE}13,${WATER}0d)` }}>
    <div style={{ textAlign: "center", color: "#fff", fontSize: 15, fontWeight: 1100 }}>MISSION PRÊTE</div>
    <div style={{ textAlign: "center", color: FIRE, fontSize: 11, fontWeight: 1000, marginTop: 4 }}>{missionLabel}</div>
    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
      {[['BRIGADE', selectedIds.length], ['CARTE', TERRITORY_MAPS[mapId]?.name || mapId], ['ROUNDS', maxRounds]].map(([label, value]) => <div key={String(label)} style={{ padding: 9, borderRadius: 12, textAlign: "center", background: "rgba(0,0,0,.28)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ color: soft, fontSize: 8, fontWeight: 950 }}>{label}</div><div style={{ color: label === 'CARTE' ? WATER : '#fff', fontWeight: 1100, fontSize: 13 }}>{value}</div></div>)}
    </div>
  </section>;

  const contentByStep = [brigadeBlock, mapBlock, fireBlock, rulesBlock, summaryBlock];

  return <div style={{ minHeight: "100dvh", color: theme?.text || "#fff", background: `radial-gradient(circle at 50% -10%,${FIRE}24 0,${theme?.bg || "#070912"} 43%,#020306 100%)`, paddingBottom: 18 }}>
    <PageHeader tickerSrc={tickerFirefighter} tickerAlt="DARTS FIREFIGHTER" left={<div style={{ marginLeft: 6 }}><BackDot onClick={back} color={FIRE} glow={`${FIRE}88`} /></div>} right={<div style={{ marginRight: 6 }}><InfoDot title="Règles DARTS FIREFIGHTER" color={WATER} glow={`${WATER}88`} content={<Rules primary={primary} />} /></div>} />
    <main style={{ width: "min(920px,100%)", margin: "0 auto", padding: "8px 9px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 10 }}><PillButton label="Guidé" active={viewMode === "guided"} onClick={() => chooseView("guided")} primary={FIRE} primarySoft={`${FIRE}18`} /><PillButton label="Complet" active={viewMode === "complete"} onClick={() => chooseView("complete")} primary={WATER} primarySoft={`${WATER}18`} /></div>
      {viewMode === "guided" ? <>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${steps.length},minmax(0,1fr))`, gap: 4, marginBottom: 9 }}>{steps.map((label, index) => <button key={label} onClick={() => setStep(index)} style={{ minHeight: 39, borderRadius: 10, border: `1px solid ${step === index ? (index === 2 ? FIRE : WATER) : "rgba(255,255,255,.08)"}`, background: step === index ? `${index === 2 ? FIRE : WATER}18` : "rgba(255,255,255,.025)", color: step === index ? "#fff" : soft, fontSize: 8, fontWeight: 1000 }}>{index + 1}<br />{label.toUpperCase()}</button>)}</div>
        {contentByStep[step]}
        <div style={{ display: "grid", gridTemplateColumns: step === 0 ? "1fr" : "1fr 1fr", gap: 8 }}>
          {step > 0 ? <button onClick={() => setStep((v) => Math.max(0, v - 1))} style={{ minHeight: 46, borderRadius: 14, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.05)", color: "#fff", fontWeight: 1000 }}>PRÉCÉDENT</button> : null}
          {step < steps.length - 1 ? <button onClick={() => setStep((v) => Math.min(steps.length - 1, v + 1))} style={{ minHeight: 46, borderRadius: 14, border: `1px solid ${WATER}88`, background: `linear-gradient(135deg,${WATER}24,${FIRE}18)`, color: "#fff", fontWeight: 1000 }}>SUIVANT</button> : <button disabled={!valid} onClick={start} style={{ minHeight: 48, borderRadius: 14, border: `1px solid ${valid ? FIRE : "#555"}`, background: valid ? `linear-gradient(135deg,${FIRE},#d83a13)` : "#282a30", color: "#fff", fontWeight: 1100, boxShadow: valid ? `0 0 24px ${FIRE}55` : "none" }}>🔥 LANCER L’INTERVENTION</button>}
        </div>
      </> : <>{brigadeBlock}{mapBlock}{fireBlock}{rulesBlock}{summaryBlock}<button disabled={!valid} onClick={start} style={{ width: "100%", minHeight: 52, borderRadius: 16, border: `1px solid ${valid ? FIRE : "#555"}`, background: valid ? `linear-gradient(135deg,${FIRE},#d83a13)` : "#282a30", color: "#fff", fontWeight: 1100, boxShadow: valid ? `0 0 24px ${FIRE}55` : "none" }}>🔥 LANCER DARTS FIREFIGHTER</button></>}
    </main>
  </div>;
}
