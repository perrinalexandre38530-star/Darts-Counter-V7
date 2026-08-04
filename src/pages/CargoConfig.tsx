// @ts-nocheck
// =============================================================
// CARGO — configuration guidée / complète
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
import {
  CARGO_VARIANT_LABELS,
  normalizeCargoConfig,
  type CargoBotLevel,
  type CargoBreakRule,
  type CargoConfigPayload,
  type CargoDBullRule,
  type CargoBullRule,
  type CargoOverloadRule,
  type CargoSeriesRule,
  type CargoVariant,
} from "../lib/gameEngines/cargoEngine";
import { recordProfileUsageForMode } from "../lib/profileUsage";
import { SelectedParticipantsCompactBlock, x01MostUsedDartSetIdForProfile } from "./X01ConfigV3";
import tickerCargo from "../assets/tickers/ticker_cargo.png";

const LS_KEY = "dc_modecfg_cargo_v1";
const ORANGE = "#ff9b42";
const GOLD = "#f6c256";
const GREEN = "#62e6a7";
const BLUE = "#56c9ff";
const RED = "#ef5261";
const SOFT = "#aab1bf";

function readSaved() {
  try { const value = JSON.parse(localStorage.getItem(LS_KEY) || "null"); return value && typeof value === "object" ? value : {}; }
  catch { return {}; }
}
function unique(ids: any[]) { return Array.from(new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))); }
function isBotLike(profile: any) { return Boolean(profile?.isBot || profile?.bot || profile?.type === "bot" || profile?.kind === "bot" || profile?.botLevel); }
function shuffle<T>(items: T[]): T[] { const out = [...items]; for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; }

function Rules() {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.47 }}>
    <div><strong style={{ color: ORANGE }}>CONTRATS</strong><br />Complète des séries exactes pour charger des palettes. Exemple : 4 × S20 = 80 kg.</div>
    <div><strong style={{ color: GOLD }}>CAMION</strong><br />Chaque palette validée augmente la cargaison. Le poids total le plus élevé remporte la partie.</div>
    <div><strong style={{ color: GREEN }}>SÉRIES</strong><br />Elles peuvent être strictes ou conserver le même numéro malgré les multiplicateurs, et continuer entre deux tours.</div>
    <div><strong style={{ color: RED }}>RISQUES</strong><br />Palettes fragiles, contrats urgents, surcharge et perte de progression dépendent de la variante.</div>
    <div><strong style={{ color: BLUE }}>COLIS</strong><br />La variante Livraison compte des colis, limite chaque série à 5 et applique des bonus de palier.</div>
  </div>;
}

function blockStyle(accent = ORANGE): React.CSSProperties {
  return { width: "100%", boxSizing: "border-box", borderRadius: 18, padding: 12, marginBottom: 10, background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(0,0,0,.30))", border: `1px solid ${accent}35`, boxShadow: "0 14px 34px rgba(0,0,0,.26)" };
}

export default function CargoConfig(props: any) {
  const { theme } = useTheme();
  const store = props?.store ?? props?.params?.store;
  const go = props?.go ?? props?.setTab ?? props?.params?.go;
  const saved = React.useMemo(readSaved, []);
  const initial = React.useMemo(() => normalizeCargoConfig(saved), [saved]);
  const allProfiles = React.useMemo(() => Array.isArray(store?.profiles) ? store.profiles : [], [store?.profiles]);
  const humanProfiles = React.useMemo(() => allProfiles.filter((p: any) => !isBotLike(p)), [allProfiles]);
  const customBots = React.useMemo(() => { try { return loadBotPlayers().map((b: any) => ({ ...b, id: String(b.id), isBot: true })); } catch { return []; } }, []);
  const profilePool = React.useMemo(() => [...humanProfiles, ...customBots], [humanProfiles, customBots]);
  const byId = React.useMemo(() => new Map(profilePool.map((p: any) => [String(p.id), p])), [profilePool]);

  const [viewMode, setViewMode] = React.useState<"guided" | "complete">(() => localStorage.getItem("dc_cargo_config_view") === "complete" ? "complete" : "guided");
  const [step, setStep] = React.useState(0);
  const steps = ["Participants", "Mission", "Séries", "Camion", "Résumé"];
  const [selectedIds, setSelectedIds] = React.useState<string[]>(unique(saved.selectedIds || []).slice(0, 12));
  const [botsPanel, setBotsPanel] = React.useState(Boolean(saved.botsPanel));
  const [botLevel, setBotLevel] = React.useState<CargoBotLevel>(initial.botLevel);
  const [variant, setVariant] = React.useState<CargoVariant>(initial.variant);
  const [participantMode, setParticipantMode] = React.useState<"players" | "teams">(initial.participantMode);
  const [rounds, setRounds] = React.useState<number>(initial.rounds);
  const [visibleContracts, setVisibleContracts] = React.useState<2 | 3 | 4>(initial.visibleContracts);
  const [seriesRule, setSeriesRule] = React.useState<CargoSeriesRule>(initial.seriesRule);
  const [carrySeriesBetweenTurns, setCarrySeriesBetweenTurns] = React.useState(initial.carrySeriesBetweenTurns);
  const [mismatchRule, setMismatchRule] = React.useState<CargoBreakRule>(initial.mismatchRule);
  const [missRule, setMissRule] = React.useState<CargoBreakRule>(initial.missRule);
  const [minSeries, setMinSeries] = React.useState(initial.minSeries);
  const [maxSeries, setMaxSeries] = React.useState(initial.maxSeries);
  const [truckCapacity, setTruckCapacity] = React.useState(initial.truckCapacity);
  const [targetWeight, setTargetWeight] = React.useState(initial.targetWeight);
  const [overloadRule, setOverloadRule] = React.useState<CargoOverloadRule>(initial.overloadRule);
  const [bullRule, setBullRule] = React.useState<CargoBullRule>(initial.bullRule);
  const [dbullRule, setDbullRule] = React.useState<CargoDBullRule>(initial.dbullRule);
  const [fragileRate, setFragileRate] = React.useState(initial.fragileRate);
  const [urgentRate, setUrgentRate] = React.useState(initial.urgentRate);
  const [randomOrder, setRandomOrder] = React.useState(initial.randomOrder);
  const [scoreInputMethod, setScoreInputMethod] = React.useState<"keypad" | "dartboard">(initial.scoreInputMethod);
  const [playerDartSets, setPlayerDartSets] = React.useState<Record<string, string | null>>(saved.playerDartSets || {});

  function togglePlayer(idRaw: string) {
    const id = String(idRaw || "");
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 12 ? prev : [...prev, id]);
    setPlayerDartSets((prev) => Object.prototype.hasOwnProperty.call(prev, id) ? prev : ({ ...prev, [id]: x01MostUsedDartSetIdForProfile(id) || null }));
  }
  function handleDartSet(id: string, dartSetId: string | null) { setPlayerDartSets((prev) => ({ ...prev, [String(id)]: dartSetId || null })); }
  function chooseView(next: "guided" | "complete") { setViewMode(next); try { localStorage.setItem("dc_cargo_config_view", next); } catch {} }
  function back() { if (typeof go === "function") go("games"); }

  const selectedItems = selectedIds.map((id) => byId.get(id)).filter(Boolean);
  const selectedBots = selectedItems.filter(isBotLike);
  const valid = selectedIds.length >= 1 && selectedIds.length <= 12;
  const isParcel = variant === "parcel_delivery";
  const usesContracts = !["free_load", "full_pallet", "parcel_delivery"].includes(variant);
  const usesCapacity = ["exact_load", "cargo_classic", "fragile_cargo", "cargo_rush", "convoy", "long_haul"].includes(variant);

  function start() {
    if (!valid) return;
    const ids = randomOrder ? shuffle(selectedIds) : [...selectedIds];
    const playersList = ids.map((id) => byId.get(id)).filter(Boolean).map((profile: any) => ({ ...profile, id: String(profile.id), name: profile?.name || profile?.displayName || "Joueur", dartSetId: playerDartSets[String(profile.id)] ?? null, isBot: isBotLike(profile) }));
    const botIds = playersList.filter(isBotLike).map((profile: any) => String(profile.id));
    const teamByPlayer: Record<string, string> = {};
    if (participantMode === "teams") ids.forEach((id, index) => { teamByPlayer[id] = index % 2 === 0 ? "ÉQUIPE A" : "ÉQUIPE B"; });
    const payload: CargoConfigPayload = normalizeCargoConfig({
      mode: "cargo", variant, players: ids.length, selectedIds: ids, playersList, playerDartSets,
      botIds, botsEnabled: botIds.length > 0, botLevel, participantMode, teamByPlayer,
      rounds, dartsPerTurn: 3, visibleContracts, seriesRule, carrySeriesBetweenTurns,
      mismatchRule, missRule, minSeries, maxSeries: isParcel ? 5 : maxSeries,
      truckCapacity, targetWeight, overloadRule, bullRule, dbullRule, fragileRate, urgentRate,
      randomOrder, scoreInputMethod,
    });
    try { localStorage.setItem(LS_KEY, JSON.stringify({ ...payload, botsPanel })); } catch {}
    try { recordProfileUsageForMode("cargo", ids); } catch {}
    if (typeof go === "function") go("cargo_play", payload);
  }

  const participantsBlock = <section style={blockStyle(ORANGE)}>
    <div style={{ color: ORANGE, fontSize: 12, fontWeight: 1000, letterSpacing: 1, marginBottom: 9 }}>ÉQUIPE DE TRANSPORT</div>
    <SelectedParticipantsCompactBlock items={selectedItems} accent={ORANGE} onRemove={togglePlayer} playerDartSets={playerDartSets} onDartSetChange={handleDartSet} allProfiles={humanProfiles} />
    <PlayerPagedSelector usageMode="cargo" profiles={humanProfiles} selectedIds={selectedIds} onToggle={togglePlayer} accent={ORANGE} pageSize={9} modalTitle="Choisir les chauffeurs" showSelectedSummary={false} />
    <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <strong style={{ color: selectedIds.length ? GREEN : "#ff9aa8", fontSize: 11 }}>{selectedIds.length ? `${selectedIds.length} participant${selectedIds.length > 1 ? "s" : ""}` : "Sélectionne au moins un joueur"}</strong>
      <button type="button" onClick={() => setBotsPanel((v) => !v)} style={{ borderRadius: 999, padding: "7px 11px", border: `1px solid ${RED}77`, background: botsPanel ? `${RED}18` : "rgba(255,255,255,.04)", color: "#fff", fontWeight: 950 }}>BOTS {botsPanel ? "ON" : "OFF"}</button>
    </div>
    {botsPanel ? <div style={{ marginTop: 10 }}><BotPagedSelector bots={customBots} selectedIds={selectedIds} onToggle={togglePlayer} accent={RED} label="CHAUFFEURS BOTS" showCheckbox={false} showSelectedSummary={false} /></div> : null}
    {selectedBots.length ? <OptionRow label="Niveau des Bots"><OptionSelect value={botLevel} options={[{ value: "easy", label: "Apprenti" }, { value: "normal", label: "Routier" }, { value: "hard", label: "Expert logistique" }]} onChange={setBotLevel} /></OptionRow> : null}
    <OptionRow label="Participants"><OptionSelect value={participantMode} options={[{ value: "players", label: "Individuel" }, { value: "teams", label: "Équipes / Convoi" }]} onChange={setParticipantMode} /></OptionRow>
  </section>;

  const missionBlock = <section style={blockStyle(GOLD)}>
    <div style={{ color: GOLD, fontSize: 12, fontWeight: 1000, letterSpacing: 1, marginBottom: 8 }}>MISSION LOGISTIQUE</div>
    <OptionRow label="Variante"><OptionSelect value={variant} options={Object.entries(CARGO_VARIANT_LABELS).map(([value, label]) => ({ value, label }))} onChange={setVariant} /></OptionRow>
    <OptionRow label="Nombre de tours"><OptionSelect value={rounds} options={[5, 8, 10, 12, 15, 20]} onChange={(v: any) => setRounds(Number(v))} /></OptionRow>
    {usesContracts ? <OptionRow label="Contrats visibles"><OptionSelect value={visibleContracts} options={[2, 3, 4]} onChange={(v: any) => setVisibleContracts(Number(v) as any)} /></OptionRow> : null}
    <OptionRow label="Ordre aléatoire"><OptionToggle value={randomOrder} onChange={setRandomOrder} /></OptionRow>
    <div style={{ color: SOFT, fontSize: 10, lineHeight: 1.5, marginTop: 7 }}>{isParcel ? "Une adresse correspond à un numéro. Les séries sont plafonnées à 5 colis et débloquent des bonus progressifs." : "Les contrats combinent segment, longueur de série, poids, urgence et fragilité."}</div>
  </section>;

  const seriesBlock = <section style={blockStyle(GREEN)}>
    <div style={{ color: GREEN, fontSize: 12, fontWeight: 1000, letterSpacing: 1, marginBottom: 8 }}>SÉRIES & RISQUE</div>
    <OptionRow label="Règle de série"><OptionSelect value={seriesRule} options={[{ value: "exact_segment", label: "Segment exact · S/D/T" }, { value: "same_number", label: "Même numéro" }]} onChange={setSeriesRule} /></OptionRow>
    <OptionRow label="Conserver entre les tours"><OptionToggle value={carrySeriesBetweenTurns} onChange={setCarrySeriesBetweenTurns} /></OptionRow>
    {!isParcel ? <><OptionRow label="Erreur de secteur"><OptionSelect value={mismatchRule} options={[{ value: "secure", label: "Sécuriser" }, { value: "partial", label: "Valider partiellement" }, { value: "lose", label: "Perdre la charge" }]} onChange={setMismatchRule} /></OptionRow>
    <OptionRow label="MISS"><OptionSelect value={missRule} options={[{ value: "secure", label: "Sécuriser" }, { value: "partial", label: "Valider partiellement" }, { value: "lose", label: "Perdre la charge" }]} onChange={setMissRule} /></OptionRow>
    <OptionRow label="Série minimale"><OptionSelect value={minSeries} options={[1, 2, 3]} onChange={(v: any) => setMinSeries(Number(v))} /></OptionRow>
    <OptionRow label="Série maximale"><OptionSelect value={maxSeries} options={[3, 4, 5, 6]} onChange={(v: any) => setMaxSeries(Number(v))} /></OptionRow></> : null}
  </section>;

  const truckBlock = <section style={blockStyle(BLUE)}>
    <div style={{ color: BLUE, fontSize: 12, fontWeight: 1000, letterSpacing: 1, marginBottom: 8 }}>{isParcel ? "TOURNÉE DE LIVRAISON" : "CAMION & MARCHANDISES"}</div>
    {usesCapacity && !isParcel ? <><OptionRow label="Capacité du camion"><OptionSelect value={truckCapacity} options={[300, 500, 750, 1000, 1500]} onChange={(v: any) => setTruckCapacity(Number(v))} /></OptionRow>
    {variant === "exact_load" ? <OptionRow label="Charge cible"><OptionSelect value={targetWeight} options={[300, 500, 750, 1000]} onChange={(v: any) => setTargetWeight(Number(v))} /></OptionRow> : null}
    <OptionRow label="En cas de surcharge"><OptionSelect value={overloadRule} options={[{ value: "reject_last", label: "Refuser la palette" }, { value: "penalty", label: "Pénalité" }, { value: "unload", label: "Décharger" }]} onChange={setOverloadRule} /></OptionRow></> : null}
    {!isParcel ? <><OptionRow label="Bull"><OptionSelect value={bullRule} options={[{ value: "weight", label: "25 kg" }, { value: "joker", label: "Joker" }, { value: "secure", label: "Sécuriser" }]} onChange={setBullRule} /></OptionRow>
    <OptionRow label="Double Bull"><OptionSelect value={dbullRule} options={[{ value: "weight", label: "50 kg" }, { value: "joker", label: "Joker" }, { value: "validate", label: "Valider la palette" }, { value: "protect", label: "Protection" }]} onChange={setDbullRule} /></OptionRow>
    <OptionRow label="Palettes fragiles"><OptionSelect value={fragileRate} options={[{ value: 0, label: "Aucune" }, { value: .15, label: "Rares" }, { value: .3, label: "Fréquentes" }, { value: .5, label: "Très fréquentes" }]} onChange={(v: any) => setFragileRate(Number(v))} /></OptionRow>
    <OptionRow label="Contrats urgents"><OptionSelect value={urgentRate} options={[{ value: 0, label: "Aucun" }, { value: .15, label: "Rares" }, { value: .3, label: "Fréquents" }, { value: .5, label: "Très fréquents" }]} onChange={(v: any) => setUrgentRate(Number(v))} /></OptionRow></> : <div style={{ color: SOFT, fontSize: 10, lineHeight: 1.5 }}>Paliers : 1 colis = 1 · 2 = 3 · 3 = 5 · 4 = 8 · 5 = 12 colis livrés.</div>}
    <OptionRow label="Mode de saisie"><OptionSelect value={scoreInputMethod} options={[{ value: "keypad", label: "Clavier" }, { value: "dartboard", label: "Cible interactive" }]} onChange={setScoreInputMethod} /></OptionRow>
  </section>;

  const summaryBlock = <section style={{ ...blockStyle(ORANGE), borderColor: `${ORANGE}77`, background: `linear-gradient(135deg,${ORANGE}18,${GOLD}0d)` }}>
    <div style={{ textAlign: "center", color: "#fff", fontSize: 16, fontWeight: 1100 }}>CARGAISON PRÊTE</div>
    <div style={{ textAlign: "center", color: ORANGE, fontSize: 11, fontWeight: 1000, marginTop: 4 }}>{CARGO_VARIANT_LABELS[variant]} · {rounds} tours · {seriesRule === "exact_segment" ? "Série stricte" : "Même numéro"}</div>
    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
      {[["PARTICIPANTS", selectedIds.length], [isParcel ? "OBJECTIF" : "CAPACITÉ", isParcel ? "COLIS" : `${truckCapacity} KG`], ["SÉRIE MAX", isParcel ? 5 : maxSeries]].map(([label, value]) => <div key={String(label)} style={{ padding: 9, borderRadius: 12, textAlign: "center", background: "rgba(0,0,0,.30)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ color: SOFT, fontSize: 8, fontWeight: 950 }}>{label}</div><div style={{ color: label === "CAPACITÉ" ? GOLD : "#fff", fontWeight: 1100, fontSize: 13 }}>{value}</div></div>)}
    </div>
  </section>;

  const contentByStep = [participantsBlock, missionBlock, seriesBlock, truckBlock, summaryBlock];

  return <div style={{ minHeight: "100dvh", color: theme?.text || "#fff", background: `radial-gradient(circle at 50% -10%,${ORANGE}28 0,${theme?.bg || "#07090d"} 43%,#020203 100%)`, paddingBottom: 18 }}>
    <PageHeader tickerSrc={tickerCargo} tickerAlt="CARGO" left={<BackDot onClick={back} color={ORANGE} glow={`${ORANGE}88`} />} right={<InfoDot title="Règles CARGO" color={GOLD} glow={`${GOLD}88`} content={<Rules />} />} />
    <main style={{ width: "min(900px,100%)", margin: "0 auto", padding: "8px", boxSizing: "border-box" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginBottom: 9 }}>
        <button onClick={() => chooseView("guided")} style={{ minHeight: 40, borderRadius: 13, border: `1px solid ${viewMode === "guided" ? ORANGE : "rgba(255,255,255,.10)"}`, background: viewMode === "guided" ? `${ORANGE}18` : "rgba(255,255,255,.03)", color: viewMode === "guided" ? ORANGE : SOFT, fontWeight: 1000 }}>CONFIGURATION GUIDÉE</button>
        <button onClick={() => chooseView("complete")} style={{ minHeight: 40, borderRadius: 13, border: `1px solid ${viewMode === "complete" ? GOLD : "rgba(255,255,255,.10)"}`, background: viewMode === "complete" ? `${GOLD}18` : "rgba(255,255,255,.03)", color: viewMode === "complete" ? GOLD : SOFT, fontWeight: 1000 }}>CONFIGURATION COMPLÈTE</button>
      </div>

      {viewMode === "guided" ? <>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${steps.length},minmax(0,1fr))`, gap: 4, marginBottom: 8 }}>{steps.map((label, index) => <button key={label} onClick={() => setStep(index)} style={{ minHeight: 36, padding: "3px", borderRadius: 10, border: `1px solid ${step === index ? ORANGE : "rgba(255,255,255,.08)"}`, background: step === index ? `${ORANGE}18` : "rgba(255,255,255,.025)", color: step === index ? ORANGE : SOFT, fontSize: 8, fontWeight: 1000 }}>{index + 1}<br />{label}</button>)}</div>
        {contentByStep[step]}
        <div style={{ display: "grid", gridTemplateColumns: step > 0 ? "1fr 1fr" : "1fr", gap: 8 }}>
          {step > 0 ? <button onClick={() => setStep((s) => Math.max(0, s - 1))} style={{ minHeight: 46, borderRadius: 14, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.04)", color: "#fff", fontWeight: 1000 }}>PRÉCÉDENT</button> : null}
          {step < steps.length - 1 ? <button onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} style={{ minHeight: 46, borderRadius: 14, border: `1px solid ${ORANGE}88`, background: `${ORANGE}18`, color: ORANGE, fontWeight: 1100 }}>SUIVANT</button> : <button disabled={!valid} onClick={start} style={{ minHeight: 48, borderRadius: 14, border: `1px solid ${GREEN}99`, background: `${GREEN}1d`, color: GREEN, opacity: valid ? 1 : .4, fontWeight: 1100 }}>LANCER CARGO</button>}
        </div>
      </> : <>
        {participantsBlock}{missionBlock}{seriesBlock}{truckBlock}{summaryBlock}
        <button disabled={!valid} onClick={start} style={{ width: "100%", minHeight: 50, borderRadius: 15, border: `1px solid ${GREEN}99`, background: `${GREEN}1d`, color: GREEN, opacity: valid ? 1 : .4, fontWeight: 1150, fontSize: 14 }}>LANCER CARGO</button>
      </>}
    </main>
  </div>;
}
