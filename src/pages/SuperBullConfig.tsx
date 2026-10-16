import React, { useMemo, useState } from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import Section from "../components/Section";
import OptionRow from "../components/OptionRow";
import OptionToggle from "../components/OptionToggle";
import OptionSelect from "../components/OptionSelect";
import { useLang } from "../contexts/LangContext";
import { SIMPLE_ROUND_VARIANTS } from "../lib/simpleRounds/variants";
import type { CommonConfig } from "../lib/simpleRounds/types";

export type SuperBullConfigPayload = CommonConfig;

const STORAGE_KEY = "msc.super_bull.last_config.v2";
const presets = [
  { id: "sprint", label: "SPRINT", sub: "5 rounds · objectif 100", rounds: 5, objective: 100 },
  { id: "standard", label: "STANDARD", sub: "10 rounds · objectif 200", rounds: 10, objective: 200 },
  { id: "expert", label: "EXPERT", sub: "15 rounds · objectif 500", rounds: 15, objective: 500 },
  { id: "score", label: "SCORE PUR", sub: "10 rounds · sans objectif", rounds: 10, objective: 0 },
] as const;

function loadLast(): Partial<CommonConfig> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch { return {}; }
}

export default function SuperBullConfig(props: any) {
  const { t } = useLang();
  const spec = SIMPLE_ROUND_VARIANTS.super_bull;
  const initial = useMemo(() => ({ ...spec.defaults, ...loadLast(), ...(props?.params?.config || {}) }), [props?.params?.config]);
  const [players, setPlayers] = useState(Number(initial.players) || 1);
  const [botsEnabled, setBotsEnabled] = useState(!!initial.botsEnabled);
  const [botLevel, setBotLevel] = useState<any>(initial.botLevel || "normal");
  const [humansCount, setHumansCount] = useState(Number(initial.humansCount || 1));
  const [rounds, setRounds] = useState(Number(initial.rounds) || 10);
  const [objective, setObjective] = useState(Number(initial.objective ?? 200));

  const cfg: CommonConfig = useMemo(() => ({
    players,
    botsEnabled,
    botLevel,
    humansCount: botsEnabled ? Math.min(Math.max(1, humansCount), Math.max(1, players - 1)) : players,
    rounds,
    objective,
  }), [players, botsEnabled, botLevel, humansCount, rounds, objective]);

  function back() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }
  function start() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch {}
    if (props?.setTab) return props.setTab("super_bull_play", { config: cfg });
  }

  return <div className="page">
    <PageHeader
      title="SUPER BULL"
      tickerSrc={spec.tickerSrc}
      left={<BackDot onClick={back} />}
      right={<InfoDot title="Règles SUPER BULL" content="3 fléchettes par volée. BULL extérieur = 25 points, DBULL = 50 points, toute autre zone = MISS. Le premier à atteindre l'objectif gagne. Sans objectif, le meilleur total à la fin des rounds gagne. En cas d'égalité : score, DBULL, centres, meilleure série puis volées parfaites." />}
    />

    <Section title="FORMAT RAPIDE">
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,minmax(0,1fr))", gap:8 }}>
        {presets.map((p) => {
          const active = rounds === p.rounds && objective === p.objective;
          return <button key={p.id} onClick={() => { setRounds(p.rounds); setObjective(p.objective); }} style={{
            borderRadius:16, padding:"12px 10px", textAlign:"left", color:"white", cursor:"pointer",
            border: active ? "1px solid rgba(39,220,255,.85)" : "1px solid rgba(255,255,255,.10)",
            background: active ? "linear-gradient(145deg,rgba(39,220,255,.18),rgba(255,255,255,.04))" : "rgba(255,255,255,.035)"
          }}><div style={{fontSize:12,fontWeight:1000,letterSpacing:.6}}>{p.label}</div><div style={{fontSize:9.5,opacity:.65,marginTop:3}}>{p.sub}</div></button>;
        })}
      </div>
    </Section>

    <Section title={t("config.players", "Joueurs")}>
      <OptionRow label={t("config.playerCount", "Nombre de joueurs")}><OptionSelect value={players} options={spec.playersOptions} onChange={(v:any) => setPlayers(Number(v))} /></OptionRow>
      <OptionRow label={t("config.bots", "Bots IA")}><OptionToggle value={botsEnabled} onChange={setBotsEnabled} /></OptionRow>
      {botsEnabled && players > 1 && <OptionRow label="Joueurs humains"><OptionSelect value={Math.min(Math.max(1, humansCount), players - 1)} options={Array.from({length:Math.max(1,players-1)},(_,i)=>i+1)} onChange={(v:any)=>setHumansCount(Number(v))} /></OptionRow>}
      {botsEnabled && <OptionRow label="Difficulté IA"><OptionSelect value={botLevel} options={[{value:"easy",label:"Facile"},{value:"normal",label:"Normal"},{value:"hard",label:"Difficile"}]} onChange={setBotLevel} /></OptionRow>}
    </Section>

    <Section title="RÈGLES DE PARTIE">
      <OptionRow label="Rounds"><OptionSelect value={rounds} options={spec.roundsOptions} onChange={(v:any)=>setRounds(Number(v))} /></OptionRow>
      <OptionRow label="Objectif"><OptionSelect value={objective} options={spec.objectiveOptions.map(v => ({ value:v, label:v===0?"Aucun · score final":`${v} points` }))} onChange={(v:any)=>setObjective(Number(v))} /></OptionRow>
      <div style={{marginTop:10,borderRadius:16,padding:12,border:"1px solid rgba(39,220,255,.18)",background:"rgba(39,220,255,.055)",fontSize:11,lineHeight:1.45,color:"rgba(255,255,255,.78)"}}>
        <b style={{color:"#27dcff"}}>BULL 25 · DBULL 50 · MISS 0</b><br/>
        {objective > 0 ? `Victoire immédiate dès ${objective} points.` : `Pas d'objectif : classement après ${rounds} rounds.`} 3 fléchettes obligatoires par volée.
      </div>
    </Section>

    <Section>
      <button className="btn-primary w-full" onClick={start}>LANCER SUPER BULL</button>
    </Section>
  </div>;
}
